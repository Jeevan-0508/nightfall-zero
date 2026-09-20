import { mulberry32, type Rng } from './rng'
import { clamp } from './vector'
import type {
  Enemy,
  EngineEvent,
  EngineEventType,
  EngineStats,
  GameStatus,
  HudSnapshot,
  InputState,
  Particle,
  Player,
  Projectile,
} from './types'
import { ARENA_HEIGHT, ARENA_WIDTH } from './types'
import { weapons, assaultRifle } from '../../content/weapons'
import { enemies as enemyDefs } from '../../content/enemies'
import { getWaveDefinition } from '../../content/waves'
import { createEnemy, createPlayer } from '../entities/factories'
import { updateEnemyMovement } from '../ai/enemyAI'
import { applyDamage } from '../combat/damage'
import { tickWeaponTimers, tryFire } from '../combat/weapons'
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
  spawnHitMarker,
  spawnImpact,
  spawnMuzzleFlash,
  spawnShellCasing,
  spawnSpawnRing,
  updateParticles,
} from './particles'
import type { WaveState } from './types'

const PLAYER_SPEED = 220
const WAVE_CLEAR_DELAY = 2.2
const SCREEN_SHAKE_HIT = 0.08
const SCREEN_SHAKE_PLAYER_HIT = 0.18
const RECOIL_KICK = 5
const RECOIL_RECOVERY_RATE = 45

export class GameEngine {
  player: Player
  enemyList: Enemy[] = []
  projectiles: Projectile[] = []
  particles: Particle[] = []
  wave: WaveState = createWaveState()
  stats: EngineStats = { kills: 0, shotsFired: 0, shotsHit: 0, survivalTime: 0, waveReached: 0 }
  status: GameStatus = 'playing'
  screenShake = 0
  recoilAmount = 0
  private rng: Rng
  private nextWaveDelay = 0
  private events: EngineEvent[] = []

  constructor(seed: number = Date.now()) {
    this.rng = mulberry32(seed)
    this.player = createPlayer({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }, assaultRifle)
    startWave(this.wave, 1)
  }

  get weaponDef() {
    return weapons[this.player.weapon.defId] ?? assaultRifle
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
    this.updatePlayerMovement(input, dt)
    this.updateWeapon(input, dt)
    this.updateProjectiles(dt)
    this.updateSpawning(dt)
    this.updateEnemies(dt)
    this.resolveProjectileHits()
    this.resolveContactDamage()
    this.particles = updateParticles(this.particles, dt)
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 4)
    if (this.recoilAmount > 0) this.recoilAmount = Math.max(0, this.recoilAmount - dt * RECOIL_RECOVERY_RATE)

    if (this.player.health <= 0) {
      this.player.alive = false
      this.status = 'dead'
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

    this.player.velocity = { x: dx * PLAYER_SPEED, y: dy * PLAYER_SPEED }
    this.player.position = {
      x: clamp(this.player.position.x + dx * PLAYER_SPEED * dt, this.player.radius, ARENA_WIDTH - this.player.radius),
      y: clamp(this.player.position.y + dy * PLAYER_SPEED * dt, this.player.radius, ARENA_HEIGHT - this.player.radius),
    }

    this.player.rotation = Math.atan2(input.aimY - this.player.position.y, input.aimX - this.player.position.x)
  }

  private updateWeapon(input: InputState, dt: number): void {
    const wasReloading = this.player.weapon.reloading
    tickWeaponTimers(this.player, this.weaponDef, dt)
    if (wasReloading && !this.player.weapon.reloading) this.pushEvent('reloadComplete')

    if (input.firing) {
      const reloadingBeforeFire = this.player.weapon.reloading
      const result = tryFire(this.player, this.weaponDef, this.rng)
      if (result.fired && result.projectile) {
        this.projectiles.push(result.projectile)
        this.stats.shotsFired += 1
        this.recoilAmount = RECOIL_KICK
        spawnMuzzleFlash(this.particles, this.player.position, this.player.rotation)
        spawnShellCasing(this.particles, this.player.position, this.player.rotation)
        this.pushEvent('shotFired')
      }
      if (!reloadingBeforeFire && this.player.weapon.reloading) this.pushEvent('reloadStart')
    }
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

  private updateSpawning(dt: number): void {
    const def = getWaveDefinition(this.wave.waveIndex || 1)
    if (this.wave.waveInProgress) {
      const result = updateWaveManager(this.wave, dt, def.spawnIntervalMs)
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
    }
  }

  private resolveProjectileHits(): void {
    const remainingProjectiles: Projectile[] = []
    for (const projectile of this.projectiles) {
      let consumed = false
      for (const enemy of this.enemyList) {
        if (!enemy.alive) continue
        const def = enemyDefs[enemy.defId]
        if (!def) continue
        if (circlesIntersect(projectile.position, projectile.radius, enemy.position, def.radius)) {
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
            spawnDeathBurst(this.particles, this.rng, enemy.position, def.color)
            notifyEnemyDeath(this.wave)
            this.stats.kills += 1
            this.awardXp(def.xpValue)
            this.pushEvent('enemyDeath')
          }
          consumed = true
          break
        }
      }
      if (!consumed) remainingProjectiles.push(projectile)
    }
    this.projectiles = remainingProjectiles
    if (this.enemyList.length > 200) {
      this.enemyList = this.enemyList.filter((e) => e.alive)
    }
  }

  private resolveContactDamage(): void {
    for (const enemy of this.enemyList) {
      if (!enemy.alive || enemy.attackCooldown > 0) continue
      const def = enemyDefs[enemy.defId]
      if (!def) continue
      if (circlesIntersect(enemy.position, def.radius, this.player.position, this.player.radius)) {
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
    this.player.xp += amount
    while (this.player.xp >= this.player.xpToNext) {
      this.player.xp -= this.player.xpToNext
      this.player.level += 1
      this.player.xpToNext = Math.round(this.player.xpToNext * 1.25)
    }
  }

  getHudSnapshot(): HudSnapshot {
    return {
      status: this.status,
      health: this.player.health,
      maxHealth: this.player.maxHealth,
      armor: this.player.armor,
      maxArmor: this.player.maxArmor,
      ammoInMag: this.player.weapon.ammoInMag,
      magazineSize: this.weaponDef.magazineSize,
      reloading: this.player.weapon.reloading,
      weaponName: this.weaponDef.name,
      waveNumber: this.wave.waveIndex,
      enemiesAlive: this.wave.enemiesAlive,
      xp: this.player.xp,
      xpToNext: this.player.xpToNext,
      level: this.player.level,
      survivalTime: this.stats.survivalTime,
      kills: this.stats.kills,
    }
  }
}
