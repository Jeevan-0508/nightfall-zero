import { mulberry32, type Rng } from './rng'
import { clamp, distance, fromAngle } from './vector'
import type {
  Enemy,
  EnemyDefinition,
  EnemyProjectile,
  EngineEvent,
  Grenade,
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
import { enemies as enemyDefs } from '../../content/enemies'
import { getWaveDefinition } from '../../content/waves'
import { createEnemy, createGrenade, createPlayer } from '../entities/factories'
import { pickUpgradeChoices, type UpgradeOption } from '../../content/upgrades'
import { updateEnemyMovement } from '../ai/enemyAI'
import { tryRangedAttack } from '../combat/rangedAttack'
import { abilityOrder } from '../../content/abilities'
import { tickAbilityTimers, tryActivate } from '../combat/abilities'
import { createDirectorState, getSpawnModifier, updateDirector, applyDirectorBias, type DirectorState } from '../director/director'
import { applyDamage } from '../combat/damage'
import { applyUpgradesToWeapon, tickWeaponTimers, tryFire } from '../combat/weapons'
import { resolveExplosion } from '../combat/explosions'
import { circlesIntersect } from '../collision/collision'
import {
  createWaveState,
  notifyEnemyDeath,
  pickSpawnPosition,
  startWave,
  updateWaveManager,
} from '../waves/waveManager'
import {
  spawnDamageText,
  spawnDeathBurst,
  spawnExplosion,
  spawnHitMarker,
  spawnImpact,
  spawnMuzzleFlash,
  spawnShellCasing,
  spawnSpawnRing,
  spawnSpit,
  updateParticles,
} from './particles'
import type { WaveState } from './types'

const PLAYER_SPEED = 220
const WAVE_CLEAR_DELAY = 2.2
const SCREEN_SHAKE_HIT = 0.08
const SCREEN_SHAKE_PLAYER_HIT = 0.18
const SCREEN_SHAKE_EXPLOSION = 0.3
const RECOIL_RECOVERY_RATE = 45
const DASH_DISTANCE = 150
const DASH_IFRAME_DURATION = 0.25
const GRENADE_DAMAGE = 55
const GRENADE_EXPLOSION_RADIUS = 110
const GRENADE_THROW_SPEED = 480
const GRENADE_FUSE = 1.0
const GRENADE_DRAG = 3
const OVERCHARGE_FIRE_RATE_MULT = 1.4
const OVERCHARGE_SPEED_MULT = 1.3

export class GameEngine {
  player: Player
  enemyList: Enemy[] = []
  projectiles: Projectile[] = []
  enemyProjectiles: EnemyProjectile[] = []
  grenades: Grenade[] = []
  particles: Particle[] = []
  wave: WaveState = createWaveState()
  stats: EngineStats = { kills: 0, shotsFired: 0, shotsHit: 0, survivalTime: 0, waveReached: 0 }
  status: GameStatus = 'playing'
  screenShake = 0
  recoilAmount = 0
  director: DirectorState = createDirectorState()
  pendingUpgradeChoices: UpgradeOption[] = []
  private pendingLevelUps = 0
  private rng: Rng
  private nextWaveDelay = 0
  private events: EngineEvent[] = []

  constructor(seed: number = Date.now()) {
    this.rng = mulberry32(seed)
    this.player = createPlayer({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, weaponOrder, assaultRifle.id, abilityOrder)
    startWave(this.wave, 1)
  }

  get weaponDef(): WeaponDefinition {
    const base = weapons[this.player.equippedWeaponId] ?? assaultRifle
    const effective = applyUpgradesToWeapon(base, this.player.upgrades)
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

  private pushEvent(type: EngineEventType): void {
    this.events.push({ type })
  }

  update(dt: number, input: InputState): void {
    if (this.status !== 'playing') return

    this.stats.survivalTime += dt
    const healthArmorBefore = this.player.health + this.player.armor
    const killsBefore = this.stats.kills

    this.updatePlayerMovement(input, dt)
    this.updateWeaponSwitch(input)
    this.updateWeapon(input, dt)
    this.updateAbilities(input, dt)
    this.updateProjectiles(dt)
    this.updateEnemyProjectiles(dt)
    this.updateGrenades(dt)
    this.updateSpawning(dt)
    this.updateEnemies(dt)
    this.resolveProjectileHits()
    this.resolveContactDamage()
    this.resolveEnemyProjectileHits()

    if (this.player.dashInvulnerableTimer > 0) {
      this.player.dashInvulnerableTimer = Math.max(0, this.player.dashInvulnerableTimer - dt)
    }

    updateDirector(this.director, dt, {
      damageTaken: Math.max(0, healthArmorBefore - (this.player.health + this.player.armor)),
      killsThisFrame: this.stats.kills - killsBefore,
      healthRatio: this.player.maxHealth > 0 ? this.player.health / this.player.maxHealth : 0,
    })

    this.particles = updateParticles(this.particles, dt)
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 4)
    if (this.recoilAmount > 0) this.recoilAmount = Math.max(0, this.recoilAmount - dt * RECOIL_RECOVERY_RATE)

    if (this.player.health <= 0) {
      this.player.alive = false
      this.status = 'dead'
    } else if (this.pendingLevelUps > 0 && this.status === 'playing') {
      this.status = 'levelup'
      this.pendingUpgradeChoices = pickUpgradeChoices(this.rng)
      this.pushEvent('levelUp')
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
      PLAYER_SPEED * this.player.upgrades.moveSpeedMultiplier * (this.isOverchargeActive() ? OVERCHARGE_SPEED_MULT : 1)
    this.player.velocity = { x: dx * speed, y: dy * speed }
    this.player.position = {
      x: clamp(this.player.position.x + dx * speed * dt, this.player.radius, ARENA_WIDTH - this.player.radius),
      y: clamp(this.player.position.y + dy * speed * dt, this.player.radius, ARENA_HEIGHT - this.player.radius),
    }

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
      const result = tryFire(this.player.position, this.player.rotation, state, weapon, this.rng)
      if (result.fired) {
        this.projectiles.push(...result.projectiles)
        this.stats.shotsFired += 1
        this.recoilAmount = weapon.recoil
        spawnMuzzleFlash(this.particles, this.player.position, this.player.rotation)
        spawnShellCasing(this.particles, this.player.position, this.player.rotation)
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
    else if (def.id === 'overcharge') this.pushEvent('overchargeActivated')
  }

  private activateDash(): void {
    const dir = fromAngle(this.player.rotation)
    this.player.position = {
      x: clamp(this.player.position.x + dir.x * DASH_DISTANCE, this.player.radius, ARENA_WIDTH - this.player.radius),
      y: clamp(this.player.position.y + dir.y * DASH_DISTANCE, this.player.radius, ARENA_HEIGHT - this.player.radius),
    }
    this.player.dashInvulnerableTimer = DASH_IFRAME_DURATION
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
      if (p.distanceRemaining > 0 && !outOfBounds) alive.push(p)
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
      if (p.distanceRemaining > 0 && !outOfBounds) alive.push(p)
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
    const result = resolveExplosion(g.position, g.explosionRadius, g.damage, this.enemyList, enemyDefs, this.particles, this.rng)
    this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_EXPLOSION)
    this.pushEvent('explosion')
    for (const enemy of result.enemiesKilled) {
      const def = enemyDefs[enemy.defId]
      if (!def) continue
      notifyEnemyDeath(this.wave)
      this.stats.kills += 1
      this.awardXp(def.xpValue)
      this.pushEvent('enemyDeath')
    }
  }

  private updateSpawning(dt: number): void {
    const def = getWaveDefinition(this.wave.waveIndex || 1)
    if (this.wave.waveInProgress) {
      const modifier = getSpawnModifier(this.director)
      applyDirectorBias(this.wave.spawnQueue, modifier.toughEnemyBias)
      const result = updateWaveManager(this.wave, dt, def.spawnIntervalMs * modifier.intervalMultiplier)
      if (result.spawnDefId) {
        const enemyDef = enemyDefs[result.spawnDefId]
        if (enemyDef) {
          const pos = pickSpawnPosition(this.rng, this.player.position)
          this.enemyList.push(createEnemy(enemyDef, pos))
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
        startWave(this.wave, this.wave.waveIndex + 1)
      }
    }
  }

  private updateEnemies(dt: number): void {
    const aliveEnemies = this.enemyList.filter((e) => e.alive)
    for (const enemy of aliveEnemies) {
      const def = enemyDefs[enemy.defId]
      if (!def) continue
      updateEnemyMovement(enemy, def, this.player, aliveEnemies, dt)

      const shot = tryRangedAttack(enemy, def, this.player)
      if (shot) {
        this.enemyProjectiles.push(shot)
        const angle = Math.atan2(shot.velocity.y, shot.velocity.x)
        spawnSpit(this.particles, enemy.position, angle)
        this.pushEvent('enemySpit')
      }
    }
  }

  private resolveEnemyProjectileHits(): void {
    const remaining: EnemyProjectile[] = []
    for (const p of this.enemyProjectiles) {
      if (this.player.dashInvulnerableTimer <= 0 && circlesIntersect(p.position, p.radius, this.player.position, this.player.radius)) {
        this.applyDamageToPlayer(p.damage)
        spawnImpact(this.particles, this.rng, p.position, 3)
        this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_HIT)
        this.pushEvent('playerHit')
        continue
      }
      remaining.push(p)
    }
    this.enemyProjectiles = remaining
  }

  private resolveProjectileHits(): void {
    const remainingProjectiles: Projectile[] = []
    for (const projectile of this.projectiles) {
      let hitEnemy: Enemy | null = null

      for (const enemy of this.enemyList) {
        if (!enemy.alive || enemy.cloaked) continue
        const def = enemyDefs[enemy.defId]
        if (!def) continue
        if (circlesIntersect(projectile.position, projectile.radius, enemy.position, def.radius)) {
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

  private applyProjectileHit(projectile: Projectile, enemy: Enemy, def: EnemyDefinition): void {
    this.stats.shotsHit += 1
    enemy.hitFlash = 0.12
    const died = applyDamage(enemy, projectile.damage)
    spawnImpact(this.particles, this.rng, enemy.position)
    spawnHitMarker(this.particles, enemy.position, projectile.isCrit)
    spawnDamageText(this.particles, enemy.position, projectile.damage, projectile.isCrit)
    this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_HIT)
    this.pushEvent(projectile.isCrit ? 'critHit' : 'hit')
    if (died) {
      enemy.alive = false
      if (def.explosionDamage && def.explosionRadius) {
        this.detonateEnemy(enemy, def)
      } else {
        spawnDeathBurst(this.particles, this.rng, enemy.position, def.color)
        notifyEnemyDeath(this.wave)
        this.stats.kills += 1
        this.awardXp(def.xpValue)
        this.pushEvent('enemyDeath')
      }
    }
  }

  /** Deals falloff-scaled area damage to the player and reports the enemy as killed (Exploder). */
  private detonateEnemy(enemy: Enemy, def: EnemyDefinition): void {
    const dist = distance(enemy.position, this.player.position)
    const radius = def.explosionRadius ?? 0
    if (radius > 0 && dist <= radius && def.explosionDamage) {
      const falloff = Math.max(0.3, 1 - dist / radius)
      this.applyDamageToPlayer(Math.round(def.explosionDamage * falloff))
    }
    spawnExplosion(this.particles, enemy.position)
    this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_EXPLOSION)
    this.pushEvent('explosion')
    notifyEnemyDeath(this.wave)
    this.stats.kills += 1
    this.awardXp(def.xpValue)
    this.pushEvent('enemyDeath')
  }

  private applyExplosion(projectile: Projectile, directHitEnemyId: number): void {
    if (!projectile.explosionRadius) return
    const result = resolveExplosion(
      projectile.position,
      projectile.explosionRadius,
      projectile.damage * 0.6,
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
      notifyEnemyDeath(this.wave)
      this.stats.kills += 1
      this.awardXp(def.xpValue)
      this.pushEvent('enemyDeath')
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
        this.applyDamageToPlayer(def.contactDamage)
        this.screenShake = Math.max(this.screenShake, SCREEN_SHAKE_PLAYER_HIT)
        this.pushEvent('playerHit')
      }
    }
  }

  private applyDamageToPlayer(amount: number): void {
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
    if (option) option.apply(this.player)
    this.pushEvent('upgradeChosen')

    this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1)
    if (this.pendingLevelUps > 0) {
      this.pendingUpgradeChoices = pickUpgradeChoices(this.rng)
    } else {
      this.pendingUpgradeChoices = []
      this.status = 'playing'
    }
  }

  getHudSnapshot(): HudSnapshot {
    const state = this.weaponState
    const weapon = this.weaponDef
    return {
      status: this.status,
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
    }
  }
}
