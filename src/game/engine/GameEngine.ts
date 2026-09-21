import { mulberry32, type Rng } from './rng'
import { clamp, distance, fromAngle, type Vector2 } from './vector'
import type {
  BossAttackId,
  Enemy,
  EnemyDefinition,
  EnemyProjectile,
  MapDefinition,
  EngineEvent,
  Grenade,
  Pickup,
  EngineEventType,
  EngineStats,
  GameStatus,
  HudSnapshot,
  InputState,
  Particle,
  Player,
  Projectile,
  WeaponDefinition,
} from './types'
import { ARENA_HEIGHT, ARENA_WIDTH } from './types'
import { weapons, weaponOrder, assaultRifle } from '../../content/weapons'
import { enemies as enemyDefs, overlord, executioner } from '../../content/enemies'

/** Largest enemy radius across all definitions, so a projectile-hit spatial query always covers the biggest possible target. */
const MAX_ENEMY_RADIUS_FOR_HIT_QUERY = Math.max(...Object.values(enemyDefs).map((d) => d.radius))
import { pickMap } from '../../content/maps'
import { getWaveDefinition } from '../../content/waves'
import { createEnemy, createEnemyProjectile, createGrenade, createPickup, createPlayer, rollElite, ELITE_DAMAGE_MULTIPLIER, ELITE_XP_MULTIPLIER } from '../entities/factories'
import { pickUpgradeChoices, type UpgradeOption } from '../../content/upgrades'
import { updateEnemyMovement } from '../ai/enemyAI'
import { updateBoss } from '../ai/bossAI'
import { tryRangedAttack } from '../combat/rangedAttack'
import { abilityOrder } from '../../content/abilities'
import { tickAbilityTimers, tryActivate } from '../combat/abilities'
import { createDirectorState, getSpawnModifier, updateDirector, applyDirectorBias, applyProfileCounter, applyWeaponProfileCounter, type DirectorState } from '../director/director'
import { createTelemetryState, updateTelemetry, recordWeaponShot, type TelemetryState } from '../director/telemetry'
import { applyMetaUpgrades } from '../meta/metaProgression'
import { getGameMode, defaultGameMode, type GameModeDefinition } from '../../content/gameModes'
import { applyDamage } from '../combat/damage'
import {
  applyStatus,
  tickStatuses,
  getDamageTakenMultiplier,
  BURN_DURATION,
  BURN_DPS,
  SLOW_DURATION,
  SLOW_MULTIPLIER,
} from '../combat/statusEffects'
import {
  rollEliteModifier,
  getArmorMultiplier,
  absorbShield,
  tickEliteRegen,
  tickEliteTeleport,
  EXPLOSIVE_DAMAGE,
  EXPLOSIVE_RADIUS,
} from '../combat/eliteModifiers'
import { applyUpgradesToWeapon, tickWeaponTimers, tryFire } from '../combat/weapons'
import { resolveExplosion } from '../combat/explosions'
import {
  getThemeStacks,
  getFireSynergyMultiplier,
  getMobilitySynergyMultiplier,
  getExplosiveSynergyDamageMultiplier,
  getExplosiveSynergyRadiusMultiplier,
  isSynergyActive,
  type UpgradeTheme,
} from '../combat/synergies'
import {
  createRunEventState,
  tickRunEvent,
  maybeStartRunEvent as rollRunEvent,
  endActiveRunEvent,
  type RunEventState,
} from '../events/runEvents'

/** Brief pause + name callout before a freshly spawned boss starts acting, reusing the existing
 * spawn-ring particle and bossSpawn audio cue rather than adding new VFX/audio. */
const BOSS_ENTRANCE_DURATION = 1.2
import { circleIntersectsAnyObstacle, circlesIntersect, resolveObstacleCollisions, sweepIntersectsCircle } from '../collision/collision'
import { SpatialGrid } from '../collision/spatialGrid'
import {
  createWaveState,
  notifyEnemyDeath,
  pickSpawnPosition,
  startWave,
  updateWaveManager,
} from '../waves/waveManager'
import {
  spawnDamageText,
  spawnDashTrail,
  spawnDeathBurst,
  spawnExplosion,
  spawnHitMarker,
  spawnImpact,
  spawnLevelUpBurst,
  spawnMuzzleFlash,
  spawnShellCasing,
  spawnSpawnRing,
  spawnSpit,
  updateParticles,
} from './particles'
import type { WaveState } from './types'

export const PLAYER_SPEED = 220

// Where projectiles/muzzle-flash actually spawn from: just past the player's collision
// edge along their aim, not the center - shared with the character renderer so the drawn
// gun barrel's visible tip and the real fire point never drift apart.
export const MUZZLE_OFFSET = 6
const WAVE_CLEAR_DELAY = 2.2
const SCREEN_SHAKE_HIT = 0.08
const SCREEN_SHAKE_PLAYER_HIT = 0.18
const SCREEN_SHAKE_EXPLOSION = 0.3
const RECOIL_RECOVERY_RATE = 45
const DASH_DISTANCE = 150
const COMBO_WINDOW = 2.5
const DASH_IFRAME_DURATION = 0.25
const GRENADE_DAMAGE = 55
const GRENADE_EXPLOSION_RADIUS = 110
const GRENADE_THROW_SPEED = 480
const GRENADE_FUSE = 1.0
const GRENADE_DRAG = 3
const OVERCHARGE_FIRE_RATE_MULT = 1.4
const OVERCHARGE_SPEED_MULT = 1.3
const SUPPLY_DROP_HEAL_RATIO = 0.3
const SUPPLY_DROP_XP = 25
const PICKUP_COLLECT_RADIUS = 30
const HUNTED_INTERVAL_MULTIPLIER = 0.55
const HUNTED_BIAS_BONUS = 0.6
const EVENT_TOAST_DURATION = 2.6

export class GameEngine {
  player: Player
  enemyList: Enemy[] = []
  projectiles: Projectile[] = []
  enemyProjectiles: EnemyProjectile[] = []
  grenades: Grenade[] = []
  pickups: Pickup[] = []
  particles: Particle[] = []
  wave: WaveState = createWaveState()
  stats: EngineStats = { kills: 0, shotsFired: 0, shotsHit: 0, survivalTime: 0, waveReached: 0 }
  status: GameStatus = 'playing'
  screenShake = 0
  /** Mirrors Enemy.hitFlash: a short-lived visual-only timer bumped whenever the player takes
   * any damage (single authoritative source: applyDamageToPlayer), decayed every tick. Purely
   * for the character renderer's hit-stagger pose, never read by gameplay logic. */
  playerHitFlash = 0
  comboCount = 0
  comboTimer = 0
  recoilAmount = 0
  director: DirectorState = createDirectorState()
  telemetry: TelemetryState = createTelemetryState()
  runEvents: RunEventState = createRunEventState()
  pendingUpgradeChoices: UpgradeOption[] = []
  chosenUpgrades: UpgradeOption[] = []
  private bossEntranceId: number | null = null
  private bossEntranceTimer = 0
  private eventToastText: string | null = null
  private eventToastTimer = 0
  map: MapDefinition
  mode: GameModeDefinition
  readonly seed: number
  private pendingLevelUps = 0
  private rng: Rng
  private nextWaveDelay = 0
  private events: EngineEvent[] = []
  /** Shared broad-phase index for enemy separation and projectile-hit queries; rebuilt whenever positions may have changed since the last query (see updateEnemies/resolveProjectileHits). */
  private readonly enemyGrid = new SpatialGrid<Enemy>(64)

  constructor(
    seed: number = Date.now(),
    startingWeaponId: string = assaultRifle.id,
    metaUpgradeRanks: Record<string, number> = {},
    gameModeId: string = defaultGameMode.id,
  ) {
    this.seed = seed >>> 0
    this.rng = mulberry32(seed)
    this.map = pickMap(this.rng)
    this.mode = getGameMode(gameModeId)
    const weaponId = weapons[startingWeaponId] ? startingWeaponId : assaultRifle.id
    this.player = createPlayer({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, weaponOrder, weaponId, abilityOrder)
    applyMetaUpgrades(this.player, metaUpgradeRanks)
    startWave(this.wave, 1)
    this.maybeSpawnBoss(1)
  }

  /** Build-theme stacks derived from every upgrade taken so far plus the currently equipped weapon
   * (see combat/synergies.ts) - cheap to recompute on demand, so there is nothing to keep in sync. */
  get themeStacks(): ReturnType<typeof getThemeStacks> {
    return getThemeStacks(this.chosenUpgrades, this.player.equippedWeaponId)
  }

  get weaponDef(): WeaponDefinition {
    const base = weapons[this.player.equippedWeaponId] ?? assaultRifle
    const upgraded = applyUpgradesToWeapon(base, this.player.upgrades, this.themeStacks)
    const effective = { ...upgraded, damage: upgraded.damage * this.mode.playerDamageMultiplier }
    if (this.isOverchargeActive()) {
      return { ...effective, fireRate: effective.fireRate * OVERCHARGE_FIRE_RATE_MULT }
    }
    return effective
  }

  private isOverchargeActive(): boolean {
    return (this.player.abilities.overcharge?.activeRemaining ?? 0) > 0
  }

  private get weaponState() {
    return this.player.weapons[this.player.equippedWeaponId]
  }

  /** Returns and clears queued gameplay events (for the audio/UI layer to react to). */
  drainEvents(): EngineEvent[] {
    const drained = this.events
    this.events = []
    return drained
  }

  private pushEvent(type: EngineEventType, sourcePosition?: Vector2): void {
    this.events.push(sourcePosition ? { type, sourcePosition } : { type })
  }

  private showEventToast(text: string): void {
    this.eventToastText = text
    this.eventToastTimer = EVENT_TOAST_DURATION
  }

  update(dt: number, input: InputState): void {
    if (this.status !== 'playing') return

    this.stats.survivalTime += dt
    const healthArmorBefore = this.player.health + this.player.armor
    const killsBefore = this.stats.kills
    const positionBefore = { x: this.player.position.x, y: this.player.position.y }

    this.updatePlayerMovement(input, dt)
    this.updateWeaponSwitch(input)
    this.updateWeapon(input, dt)
    this.updateAbilities(input, dt)
    this.updateProjectiles(dt)
    this.updateEnemyProjectiles(dt)
    this.updateGrenades(dt)
    this.updatePickups(dt)
    tickRunEvent(this.runEvents, dt)
    if (this.eventToastTimer > 0) this.eventToastTimer = Math.max(0, this.eventToastTimer - dt)
    this.updateSpawning(dt)
    this.updateEnemies(dt)
    this.resolveProjectileHits(dt)
    this.resolveContactDamage()
    this.resolveEnemyProjectileHits()

    if (this.player.dashInvulnerableTimer > 0) {
      this.player.dashInvulnerableTimer = Math.max(0, this.player.dashInvulnerableTimer - dt)
    }

    let nearestEnemyDistance: number | null = null
    for (const enemy of this.enemyList) {
      if (!enemy.alive) continue
      const d = distance(this.player.position, enemy.position)
      if (nearestEnemyDistance === null || d < nearestEnemyDistance) nearestEnemyDistance = d
    }
    updateTelemetry(this.telemetry, dt, {
      movementDistance: distance(positionBefore, this.player.position),
      nearestEnemyDistance,
      playerPosition: this.player.position,
    })

    updateDirector(this.director, dt, {
      damageTaken: Math.max(0, healthArmorBefore - (this.player.health + this.player.armor)),
      killsThisFrame: this.stats.kills - killsBefore,
      healthRatio: this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0,
    })

    this.particles = updateParticles(this.particles, dt)
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 4)
    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt)
      if (this.comboTimer === 0) this.comboCount = 0
    }
    if (this.recoilAmount > 0) this.recoilAmount = Math.max(0, this.recoilAmount - dt * RECOIL_RECOVERY_RATE)
    if (this.playerHitFlash > 0) this.playerHitFlash = Math.max(0, this.playerHitFlash - dt * 6)

    if (this.player.health <= 0) {
      this.player.alive = false
      this.status = 'dead'
    } else if (this.pendingLevelUps > 0 && this.status === 'playing') {
      this.status = 'levelup'
      this.pendingUpgradeChoices = pickUpgradeChoices(this.rng, this.player.level)
      this.pushEvent('levelUp')
      spawnLevelUpBurst(this.particles, this.rng, this.player.position)
    }
  }

  private updatePlayerMovement(input: InputState, dt: number): void {
    let dx = 0
    let dy = 0
    if (input.up) dy -= 1
    if (input.down) dy += 1
    if (input.left) dx -= 1
    if (input.right) dx += 1

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy)
      dx /= len
      dy /= len
    }

    const speed =
      PLAYER_SPEED *
      this.player.upgrades.moveSpeedMultiplier *
      getMobilitySynergyMultiplier(this.themeStacks) *
      (this.isOverchargeActive() ? OVERCHARGE_SPEED_MULT : 1)
    this.player.velocity = { x: dx * speed, y: dy * speed }
    const moved = {
      x: clamp(this.player.position.x + dx * speed * dt, this.player.radius, ARENA_WIDTH - this.player.radius),
      y: clamp(this.player.position.y + dy * speed * dt, this.player.radius, ARENA_HEIGHT - this.player.radius),
    }
    this.player.position = resolveObstacleCollisions(moved, this.player.radius, this.map.obstacles)

    this.player.rotation = Math.atan2(input.aimY - this.player.position.y, input.aimX - this.player.position.x)
  }

  private updateWeaponSwitch(input: InputState): void {
    if (!input.switchTo) return
    if (input.switchTo === this.player.equippedWeaponId) return
    if (!this.player.weapons[input.switchTo]) return

    this.player.equippedWeaponId = input.switchTo
    this.pushEvent('weaponSwitch')
  }

  private updateWeapon(input: InputState, dt: number): void {
    const state = this.weaponState
    const weapon = this.weaponDef

    const wasReloading = state.reloading
    tickWeaponTimers(state, weapon, dt)
    if (wasReloading && !state.reloading) this.pushEvent('reloadComplete')

    if (input.firing) {
      const reloadingBeforeFire = state.reloading
      // Spawn from the muzzle (just past the player's edge, along their aim), not the player's
      // center - otherwise every shot visually originates from inside the player sprite.
      const facing = fromAngle(this.player.rotation)
      const muzzlePosition = {
        x: this.player.position.x + facing.x * (this.player.radius + MUZZLE_OFFSET),
        y: this.player.position.y + facing.y * (this.player.radius + MUZZLE_OFFSET),
      }
      const result = tryFire(muzzlePosition, this.player.rotation, state, weapon, this.rng)
      if (result.fired) {
        this.projectiles.push(...result.projectiles)
        this.stats.shotsFired += 1
        this.recoilAmount = weapon.recoil
        spawnMuzzleFlash(this.particles, muzzlePosition, this.player.rotation, weapon.id)
        spawnShellCasing(this.particles, this.player.position, this.player.rotation)
        recordWeaponShot(this.telemetry, weapon.id)
        this.pushEvent('shotFired')
      }
      if (!reloadingBeforeFire && state.reloading) this.pushEvent('reloadStart')
    }
  }

  private updateAbilities(input: InputState, dt: number): void {
    for (const def of abilityOrder) {
      const state = this.player.abilities[def.id]
      if (state) tickAbilityTimers(state, dt)
    }

    const triggered = input.abilityTrigger
    if (!triggered) return

    const def = abilityOrder.find((a) => a.id === triggered)
    const state = def ? this.player.abilities[def.id] : undefined
    if (!def || !state) return
    if (!tryActivate(state, def)) return

    if (def.id === 'dash') this.activateDash()
    else if (def.id === 'grenade') this.activateGrenade()
    else if (def.id === 'overcharge') { this.pushEvent('overchargeActivated'); this.showEventToast('OVERCHARGE ACTIVE') }
  }

  private activateDash(): void {
    const fromPos = { x: this.player.position.x, y: this.player.position.y }
    const dir = fromAngle(this.player.rotation)
    this.player.position = {
      x: clamp(this.player.position.x + dir.x * DASH_DISTANCE, this.player.radius, ARENA_WIDTH - this.player.radius),
      y: clamp(this.player.position.y + dir.y * DASH_DISTANCE, this.player.radius, ARENA_HEIGHT - this.player.radius),
    }
    this.player.dashInvulnerableTimer = DASH_IFRAME_DURATION
    spawnDashTrail(this.particles, fromPos, this.player.position)
    this.pushEvent('dashUsed')
  }

  private activateGrenade(): void {
    const dir = fromAngle(this.player.rotation, GRENADE_THROW_SPEED)
    this.grenades.push(
      createGrenade(this.player.position, dir, GRENADE_DAMAGE, GRENADE_EXPLOSION_RADIUS, GRENADE_FUSE),
    )
    this.pushEvent('grenadeThrown')
  }

  private updateProjectiles(dt: number): void {
    const alive: Projectile[] = []
    for (const p of this.projectiles) {
      const travel = Math.hypot(p.velocity.x, p.velocity.y) * dt
      p.position = { x: p.position.x + p.velocity.x * dt, y: p.position.y + p.velocity.y * dt }
      p.distanceRemaining -= travel
      const outOfBounds =
        p.position.x < 0 || p.position.x > ARENA_WIDTH || p.position.y < 0 || p.position.y > ARENA_HEIGHT
      const blocked = circleIntersectsAnyObstacle(p.position, p.radius, this.map.obstacles)
      if (p.distanceRemaining > 0 && !outOfBounds && !blocked) alive.push(p)
    }
    this.projectiles = alive
  }

  private updateEnemyProjectiles(dt: number): void {
    const alive: EnemyProjectile[] = []
    for (const p of this.enemyProjectiles) {
      const travel = Math.hypot(p.velocity.x, p.velocity.y) * dt
      p.position = { x: p.position.x + p.velocity.x * dt, y: p.position.y + p.velocity.y * dt }
      p.distanceRemaining -= travel
      const outOfBounds =
        p.position.x < 0 || p.position.x > ARENA_WIDTH || p.position.y < 0 || p.position.y > ARENA_HEIGHT
      const blocked = circleIntersectsAnyObstacle(p.position, p.radius, this.map.obstacles)
      if (p.distanceRemaining > 0 && !outOfBounds && !blocked) alive.push(p)
    }
    this.enemyProjectiles = alive
  }

  private updateGrenades(dt: number): void {
    const remaining: Grenade[] = []
    for (const g of this.grenades) {
      const decay = Math.exp(-GRENADE_DRAG * dt)
      g.velocity = { x: g.velocity.x * decay, y: g.velocity.y * decay }
      g.position = { x: g.position.x + g.velocity.x * dt, y: g.position.y + g.velocity.y * dt }
      g.position.x = clamp(g.position.x, 0, ARENA_WIDTH)
      g.position.y = clamp(g.position.y, 0, ARENA_HEIGHT)
      g.fuseRemaining -= dt

      if (g.fuseRemaining <= 0) {
        this.detonateGrenade(g)
      } else {
        remaining.push(g)
      }
    }
    this.grenades = remaining
  }

  private detonateGrenade(g: Grenade): void {
    const stacks = this.themeStacks
    const radius = g.explosionRadius * this.player.upgrades.explosionRadiusMultiplier * getExplosiveSynergyRadiusMultiplier(stacks)
    const damage = g.damage * this.player.upgrades.explosionDamageMultiplier * getExplosiveSynergyDamageMultiplier(stacks)
    const result = resolveExplosion(g.position, radius, damage, this.enemyList, enemyDefs, this.particles, this.rng)
    this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_EXPLOSION)
    this.pushEvent('explosion')
    for (const enemy of result.enemiesKilled) {
      const def = enemyDefs[enemy.defId]
      if (!def) continue
      this.notifyKill(def, enemy.elite)
    }
  }

  private updateSpawning(dt: number): void {
    const def = getWaveDefinition(this.wave.waveIndex || 1)
    if (this.wave.waveInProgress) {
      const hunted = this.runEvents.active?.kind === 'hunted'
      const modifier = getSpawnModifier(this.director)
      applyDirectorBias(this.wave.spawnQueue, modifier.toughEnemyBias + (hunted ? HUNTED_BIAS_BONUS : 0))
      applyProfileCounter(this.wave.spawnQueue, this.telemetry.profile)
      applyWeaponProfileCounter(this.wave.spawnQueue, this.telemetry.weaponProfile)
      const huntedIntervalMultiplier = hunted ? HUNTED_INTERVAL_MULTIPLIER : 1
      const result = updateWaveManager(
        this.wave,
        dt,
        def.spawnIntervalMs * modifier.intervalMultiplier * this.mode.spawnIntervalMultiplier * huntedIntervalMultiplier,
      )
      if (result.spawnDefId) {
        const enemyDef = enemyDefs[result.spawnDefId]
        if (enemyDef) {
          const pos = pickSpawnPosition(this.rng, this.player.position, this.map.obstacles)
          this.enemyList.push(this.spawnEnemy(enemyDef, pos, rollElite(this.rng, this.wave.waveIndex)))
          spawnSpawnRing(this.particles, pos)
          this.pushEvent('enemySpawn')
        }
      }
      if (result.waveCompleted) {
        this.stats.waveReached = this.wave.waveIndex
        this.nextWaveDelay = WAVE_CLEAR_DELAY
      }
    } else if (this.nextWaveDelay > 0) {
      this.nextWaveDelay -= dt
      if (this.nextWaveDelay <= 0) {
        const nextWaveIndex = this.wave.waveIndex + 1
        startWave(this.wave, nextWaveIndex)
        this.maybeSpawnBoss(nextWaveIndex)
        this.maybeStartRunEvent(nextWaveIndex)
      }
    }
  }

  /** Rolled once per wave start (rare, bounded - see runEvents.ts). Blackout and Hunted are
   * duration-only flags read elsewhere; Supply Drop additionally spawns the one pickup it grants. */
  private maybeStartRunEvent(waveIndex: number): void {
    const kind = rollRunEvent(this.runEvents, waveIndex, this.rng)
    if (!kind) return
    if (kind === 'blackout') {
      this.pushEvent('blackoutStart')
      this.showEventToast('BLACKOUT: RADAR DOWN')
    } else if (kind === 'hunted') {
      this.pushEvent('huntedStart')
      this.showEventToast('HUNTED: THEY KNOW WHERE YOU ARE')
    } else if (kind === 'supplyDrop') {
      const pos = pickSpawnPosition(this.rng, this.player.position, this.map.obstacles)
      const duration = this.runEvents.active?.remaining ?? 14
      this.pickups.push(createPickup(pos, duration))
      spawnSpawnRing(this.particles, pos)
      this.pushEvent('supplyDropSpawned')
      this.showEventToast('SUPPLY DROP INCOMING')
    }
  }

  /** Supply Drop's reward: heal + a flat XP bump, both reusing existing player fields rather than
   * a new currency - collecting resolves the event immediately instead of waiting out its timer. */
  private updatePickups(dt: number): void {
    const remaining: Pickup[] = []
    for (const pickup of this.pickups) {
      pickup.ttl -= dt
      if (pickup.ttl <= 0) continue

      if (distance(this.player.position, pickup.position) <= PICKUP_COLLECT_RADIUS) {
        this.player.health = Math.min(this.player.maxHealth, this.player.health + this.player.maxHealth * SUPPLY_DROP_HEAL_RATIO)
        this.awardXp(SUPPLY_DROP_XP)
        spawnLevelUpBurst(this.particles, this.rng, pickup.position)
        endActiveRunEvent(this.runEvents)
        this.pushEvent('supplyDropCollected')
        this.showEventToast('SUPPLY DROP COLLECTED')
        continue
      }
      remaining.push(pickup)
    }
    this.pickups = remaining
  }

  /**
   * Every mode.bossWaveInterval waves, a boss spawns alongside the normal roster and counts
   * toward wave-clear. Bosses alternate: the tanky Overlord on the first encounter, the
   * faster, harder-hitting Executioner on the second, back to Overlord on the third, and so on.
   */
  private maybeSpawnBoss(waveIndex: number): void {
    if (waveIndex % this.mode.bossWaveInterval !== 0) return
    const encounterNumber = waveIndex / this.mode.bossWaveInterval
    const bossDef = encounterNumber % 2 === 1 ? overlord : executioner
    const boss = this.spawnEnemy(bossDef, { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT * 0.2 })
    this.enemyList.push(boss)
    this.wave.enemiesAlive += 1
    this.bossEntranceId = boss.id
    this.bossEntranceTimer = BOSS_ENTRANCE_DURATION
    spawnSpawnRing(this.particles, boss.position)
    this.pushEvent('bossSpawn')
  }

  /** Creates an enemy and applies the active mode's health multiplier. An elite spawn also rolls exactly one flavor modifier. */
  private spawnEnemy(def: EnemyDefinition, position: Vector2, elite = false): Enemy {
    const modifier = elite ? rollEliteModifier(this.rng) : null
    const enemy = createEnemy(def, position, elite, modifier)
    enemy.health *= this.mode.enemyHealthMultiplier
    enemy.maxHealth *= this.mode.enemyHealthMultiplier
    return enemy
  }

  private updateEnemies(dt: number): void {
    const aliveEnemies = this.enemyList.filter((e) => e.alive)
    this.enemyGrid.rebuild(aliveEnemies)
    for (const enemy of aliveEnemies) {
      const def = enemyDefs[enemy.defId]
      if (!def) continue

      if (def.behavior === 'boss') {
        if (enemy.hitFlash > 0) enemy.hitFlash = Math.max(0, enemy.hitFlash - dt)
        if (this.bossEntranceId === enemy.id && this.bossEntranceTimer > 0) {
          this.bossEntranceTimer = Math.max(0, this.bossEntranceTimer - dt)
          continue // holds still, no attacks, while the entrance callout plays
        }
        const bossResult = updateBoss(enemy, def, this.player, dt, this.map.obstacles)
        if (enemy.attackCooldown > 0) enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt)
        this.resolveBossAttack(enemy, def, bossResult.resolveAttack)
        this.applyBurnTick(enemy, def, dt)
        continue
      }

      updateEnemyMovement(enemy, def, this.player, this.enemyGrid, dt, this.map.obstacles)
      this.applyBurnTick(enemy, def, dt)
      tickEliteRegen(enemy, dt)
      this.applyEliteTeleportTick(enemy, dt)

      const shot = tryRangedAttack(enemy, def, this.player)
      if (shot) {
        this.enemyProjectiles.push(shot)
        const angle = Math.atan2(shot.velocity.y, shot.velocity.x)
        spawnSpit(this.particles, enemy.position, angle)
        this.pushEvent('enemySpit')
      }
    }
  }

  /** Advances the enemy's statuses and applies this tick's burn damage, if any, through the shared death branch. */
  private applyBurnTick(enemy: Enemy, def: EnemyDefinition, dt: number): void {
    const burnDamage = tickStatuses(enemy, dt)
    if (burnDamage <= 0 || !enemy.alive) return
    const died = applyDamage(enemy, burnDamage)
    this.finalizeEnemyDeath(enemy, def, died)
  }

  /** A Teleporting elite blinks to a fresh safe spot (same distance/obstacle rules as a spawn point) once its warning window elapses. */
  private applyEliteTeleportTick(enemy: Enemy, dt: number): void {
    if (!tickEliteTeleport(enemy, dt)) return
    spawnSpawnRing(this.particles, enemy.position)
    enemy.position = pickSpawnPosition(this.rng, this.player.position, this.map.obstacles)
    spawnSpawnRing(this.particles, enemy.position)
  }

  private resolveBossAttack(enemy: Enemy, def: EnemyDefinition, attackId: BossAttackId | null): void {
    if (!attackId) return

    if (attackId === 'slam') {
      const radius = def.bossSlamRadius ?? 100
      if (distance(enemy.position, this.player.position) <= radius) {
        this.applyDamageToPlayer(def.bossSlamDamage ?? 20)
        this.pushEvent('playerHit', enemy.position)
      }
      spawnExplosion(this.particles, enemy.position, radius)
      this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_EXPLOSION)
      this.pushEvent('bossSlam')
      return
    }

    if (attackId === 'barrage') {
      const count = def.bossBarrageCount ?? 6
      const baseAngle = Math.atan2(
        this.player.position.y - enemy.position.y,
        this.player.position.x - enemy.position.x,
      )
      const spread = Math.PI / 6
      const speed = def.bossBarrageProjectileSpeed ?? 220
      for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0.5 : i / (count - 1)
        const angle = baseAngle - spread / 2 + spread * t
        const velocity = { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
        this.enemyProjectiles.push(createEnemyProjectile(enemy.position, velocity, def.bossBarrageDamage ?? 10, 500))
      }
      this.pushEvent('bossBarrage')
      return
    }

    this.pushEvent('bossCharge')
  }

  private resolveEnemyProjectileHits(): void {
    const remaining: EnemyProjectile[] = []
    for (const p of this.enemyProjectiles) {
      if (this.player.dashInvulnerableTimer <= 0 && circlesIntersect(p.position, p.radius, this.player.position, this.player.radius)) {
        this.applyDamageToPlayer(p.damage)
        spawnImpact(this.particles, this.rng, p.position, 3)
        this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_HIT)
        this.pushEvent('playerHit', p.position)
        continue
      }
      remaining.push(p)
    }
    this.enemyProjectiles = remaining
  }

  private resolveProjectileHits(dt: number): void {
    // Enemies may have moved since updateEnemies() built the grid this tick, so it's rebuilt
    // here with current positions before being used for hit queries.
    this.enemyGrid.rebuild(this.enemyList.filter((e) => e.alive))
    const remainingProjectiles: Projectile[] = []
    for (const projectile of this.projectiles) {
      let hitEnemy: Enemy | null = null

      // updateProjectiles() already advanced position this tick; reconstruct where it started so
      // fast projectiles (e.g. the sniper) are checked against the whole path they swept through,
      // not just the point they ended at - otherwise a bullet can travel clean past a small target
      // between two frames without ever registering a hit (tunneling).
      const previousPosition = {
        x: projectile.position.x - projectile.velocity.x * dt,
        y: projectile.position.y - projectile.velocity.y * dt,
      }
      const travelDistance = Math.hypot(
        projectile.position.x - previousPosition.x,
        projectile.position.y - previousPosition.y,
      )
      const nearby = this.enemyGrid.queryRadius(
        projectile.position,
        projectile.radius + MAX_ENEMY_RADIUS_FOR_HIT_QUERY + travelDistance,
      )
      for (const enemy of nearby) {
        if (!enemy.alive || enemy.cloaked) continue
        const def = enemyDefs[enemy.defId]
        if (!def) continue
        if (sweepIntersectsCircle(previousPosition, projectile.position, projectile.radius, enemy.position, def.radius)) {
          hitEnemy = enemy
          this.applyProjectileHit(projectile, enemy, def)
          break
        }
      }

      if (hitEnemy && projectile.explosionRadius) {
        this.applyExplosion(projectile, hitEnemy.id)
        continue // rockets are consumed on impact regardless of pierce
      }

      if (hitEnemy) {
        if (projectile.pierceRemaining > 0) {
          projectile.pierceRemaining -= 1
          remainingProjectiles.push(projectile)
          if (projectile.weaponId === 'energy-weapon') this.spawnPierceArc(projectile, hitEnemy)
        }
        continue
      }

      remainingProjectiles.push(projectile)
    }
    this.projectiles = remainingProjectiles
    if (this.enemyList.length > 200) {
      this.enemyList = this.enemyList.filter((e) => e.alive)
    }
  }

  /** Cyan glow bridging a piercing energy-weapon hit to where the beam continues, standing in for a lightning arc jumping to its next target. */
  private spawnPierceArc(projectile: Projectile, hitEnemy: Enemy): void {
    const speed = Math.hypot(projectile.velocity.x, projectile.velocity.y) || 1
    const ahead = {
      x: hitEnemy.position.x + (projectile.velocity.x / speed) * 26,
      y: hitEnemy.position.y + (projectile.velocity.y / speed) * 26,
    }
    spawnDashTrail(this.particles, hitEnemy.position, ahead)
  }

  private applyProjectileHit(projectile: Projectile, enemy: Enemy, def: EnemyDefinition): void {
    this.stats.shotsHit += 1
    enemy.hitFlash = 0.12
    const rawDamage =
      projectile.damage * getDamageTakenMultiplier(enemy) * getArmorMultiplier(enemy, projectile.isCrit)
    const { remainingDamage, justBroke } = absorbShield(enemy, rawDamage)
    const scaledDamage = Math.round(remainingDamage)
    const died = applyDamage(enemy, scaledDamage)
    spawnImpact(this.particles, this.rng, enemy.position, justBroke ? 9 : 5)
    spawnHitMarker(this.particles, enemy.position, projectile.isCrit)
    spawnDamageText(this.particles, enemy.position, scaledDamage, projectile.isCrit)
    this.screenShake = Math.max(this.screenShake, justBroke ? SCREEN_SHAKE_EXPLOSION * 0.5 : SCREEN_SHAKE_HIT)
    this.pushEvent(projectile.isCrit ? 'critHit' : 'hit')
    if (!died) {
      if (projectile.weaponId === 'flamethrower') {
        const duration = BURN_DURATION * this.player.upgrades.burnDurationMultiplier
        const magnitude = BURN_DPS * this.player.upgrades.burnDamageMultiplier * getFireSynergyMultiplier(this.themeStacks)
        applyStatus(enemy, 'burn', duration, magnitude)
      }
      if (projectile.isCrit) applyStatus(enemy, 'slow', SLOW_DURATION, SLOW_MULTIPLIER)
    }
    this.finalizeEnemyDeath(enemy, def, died)
  }

  /** Shared death branch for any damage source (direct hit or passive burn tick): explode if the enemy is an Exploder OR an Explosive elite, otherwise a plain death burst + kill credit. */
  private finalizeEnemyDeath(enemy: Enemy, def: EnemyDefinition, died: boolean): void {
    if (!died) return
    enemy.alive = false
    if ((def.explosionDamage && def.explosionRadius) || enemy.eliteModifier === 'explosive') {
      this.detonateEnemy(enemy, def)
    } else {
      spawnDeathBurst(this.particles, this.rng, enemy.position, def.color)
      this.notifyKill(def, enemy.elite)
    }
  }

  /** Deals falloff-scaled area damage to the player and reports the enemy as killed. Falls back to the Explosive-elite constants when the enemy's own def has no built-in explosion (any roster enemy can roll Explosive, not just Exploder). */
  private detonateEnemy(enemy: Enemy, def: EnemyDefinition): void {
    const damage = def.explosionDamage ?? EXPLOSIVE_DAMAGE
    const radius = def.explosionRadius ?? EXPLOSIVE_RADIUS
    const dist = distance(enemy.position, this.player.position)
    if (radius > 0 && dist <= radius && damage) {
      const falloff = Math.max(0.3, 1 - dist / radius)
      this.applyDamageToPlayer(Math.round(damage * falloff * (enemy.elite ? ELITE_DAMAGE_MULTIPLIER : 1)))
    }
    spawnExplosion(this.particles, enemy.position, radius)
    this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_EXPLOSION)
    this.pushEvent('explosion')
    this.notifyKill(def, enemy.elite)
  }

  private applyExplosion(projectile: Projectile, directHitEnemyId: number): void {
    if (!projectile.explosionRadius) return
    const stacks = this.themeStacks
    const radius =
      projectile.explosionRadius * this.player.upgrades.explosionRadiusMultiplier * getExplosiveSynergyRadiusMultiplier(stacks)
    const damage =
      projectile.damage * 0.6 * this.player.upgrades.explosionDamageMultiplier * getExplosiveSynergyDamageMultiplier(stacks)
    const result = resolveExplosion(
      projectile.position,
      radius,
      damage,
      this.enemyList,
      enemyDefs,
      this.particles,
      this.rng,
      directHitEnemyId,
    )
    this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_EXPLOSION)
    this.pushEvent('explosion')
    for (const enemy of result.enemiesKilled) {
      const def = enemyDefs[enemy.defId]
      if (!def) continue
      this.notifyKill(def, enemy.elite)
    }
  }

  private resolveContactDamage(): void {
    if (this.player.dashInvulnerableTimer > 0) return
    for (const enemy of this.enemyList) {
      if (!enemy.alive || enemy.attackCooldown > 0) continue
      const def = enemyDefs[enemy.defId]
      if (!def) continue
      if (circlesIntersect(enemy.position, def.radius, this.player.position, this.player.radius)) {
        if (def.explosionDamage && def.explosionRadius) {
          enemy.alive = false
          this.detonateEnemy(enemy, def)
          continue
        }
        enemy.attackCooldown = def.contactCooldown
        this.applyDamageToPlayer(enemy.elite ? def.contactDamage * ELITE_DAMAGE_MULTIPLIER : def.contactDamage)
        this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_PLAYER_HIT)
        this.pushEvent('playerHit', enemy.position)
      }
    }
  }

  private notifyKill(def: EnemyDefinition, elite = false): void {
    notifyEnemyDeath(this.wave)
    this.stats.kills += 1
    this.comboCount += 1
    this.comboTimer = COMBO_WINDOW
    this.awardXp(def.xpValue * (elite ? ELITE_XP_MULTIPLIER : 1))
    this.pushEvent('enemyDeath')
    if (def.behavior === 'boss') this.pushEvent('bossDefeated')
  }

  private applyDamageToPlayer(rawAmount: number): void {
    if (rawAmount > 0) this.playerHitFlash = 0.16
    let amount = rawAmount * this.mode.enemyDamageMultiplier
    if (this.player.armor > 0) {
      const absorbed = Math.min(this.player.armor, amount)
      this.player.armor -= absorbed
      amount -= absorbed
    }
    if (amount > 0) this.player.health = Math.max(0, this.player.health - amount)
  }

  private awardXp(amount: number): void {
    this.player.xp += amount * this.player.upgrades.xpGainMultiplier
    while (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext
      this.player.level += 1
      this.player.xpToNext = Math.round(this.player.xpToNext * 1.25)
      this.pendingLevelUps += 1
    }
  }

  /** Applies the chosen upgrade, then either serves the next queued level-up or resumes play. */
  chooseUpgrade(id: string): void {
    if (this.status !== 'levelup') return
    const option = this.pendingUpgradeChoices.find((o) => o.id === id)
    if (option) {
      option.apply(this.player)
      this.chosenUpgrades.push(option)
    }
    this.pushEvent('upgradeChosen')

    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1)
    if (this.pendingLevelUps > 0) {
      this.pendingUpgradeChoices = pickUpgradeChoices(this.rng, this.player.level)
    } else {
      this.pendingUpgradeChoices = []
      this.status = 'playing'
    }
  }

  getHudSnapshot(): HudSnapshot {
    const state = this.weaponState
    const weapon = this.weaponDef
    const bossEnemy = this.enemyList.find((e) => e.alive && enemyDefs[e.defId]?.behavior === 'boss')
    const stacks = this.themeStacks
    const activeSynergies = (Object.keys(stacks) as UpgradeTheme[]).filter((theme) => isSynergyActive(stacks, theme))
    const bossEntrance =
      bossEnemy && this.bossEntranceId === bossEnemy.id && this.bossEntranceTimer > 0
        ? { name: enemyDefs[bossEnemy.defId].name }
        : null
    return {
      status: this.status,
      activeSynergies,
      bossEntrance,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      armor: this.player.armor,
      maxArmor: this.player.maxArmor,
      ammoInMag: state.ammoInMag,
      magazineSize: weapon.magazineSize,
      reloading: state.reloading,
      weaponName: weapon.name,
      weaponIndex: weaponOrder.findIndex((w) => w.id === weapon.id),
      waveNumber: this.wave.waveIndex,
      enemiesAlive: this.wave.enemiesAlive,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      level: this.player.level,
      survivalTime: this.stats.survivalTime,
      kills: this.stats.kills,
      mapName: this.map.name,
      modeName: this.mode.name,
      combo: this.comboCount,
      playerPosition: { x: this.player.position.x, y: this.player.position.y },
      radarBlips: this.enemyList
        .filter((e) => e.alive)
        .map((e) => ({ id: e.id, x: e.position.x, y: e.position.y, boss: enemyDefs[e.defId]?.behavior === 'boss' })),
      runEvent: this.runEvents.active
        ? {
            kind: this.runEvents.active.kind,
            remaining: this.runEvents.active.remaining,
            totalDuration: this.runEvents.active.totalDuration,
          }
        : null,
      eventToast: this.eventToastTimer > 0 && this.eventToastText ? { text: this.eventToastText } : null,
      debug: {
        intensity: this.director.intensity,
        calmActive: this.director.calmTimer > 0,
        profile: this.telemetry.profile,
        weaponProfile: this.telemetry.weaponProfile,
        avgMovementSpeed: this.telemetry.avgMovementSpeed,
        avgNearestEnemyDistance: this.telemetry.avgNearestEnemyDistance,
        avgEdgeDistance: this.telemetry.avgEdgeDistance,
        accuracy: this.stats.shotsFired > 0 ? this.stats.shotsHit / this.stats.shotsFired : 0,
      },
      abilities: abilityOrder.map((def) => {
        const abilityState = this.player.abilities[def.id]
        return {
          id: def.id,
          name: def.name,
          key: def.key,
          cooldown: def.cooldown,
          cooldownRemaining: abilityState?.cooldownRemaining ?? 0,
          active: (abilityState?.activeRemaining ?? 0) > 0,
        }
      }),
      boss: bossEnemy
        ? {
            name: enemyDefs[bossEnemy.defId].name,
            health: bossEnemy.health,
            maxHealth: bossEnemy.maxHealth,
            attackTelegraph: bossEnemy.bossPhase === 'telegraph' ? bossEnemy.bossAttackId : null,
            stage: bossEnemy.bossStage,
          }
        : null,
    }
  }
}
