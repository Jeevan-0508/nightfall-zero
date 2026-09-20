import type { Vector2 } from './vector'

export const ARENA_WIDTH = 960
export const ARENA_HEIGHT = 600

export type GameStatus = 'playing' | 'dead' | 'levelup'

export interface WeaponDefinition {
  id: string
  name: string
  damage: number
  fireRate: number // shots per second
  magazineSize: number
  reloadTime: number // seconds
  bulletSpeed: number // px/sec
  spread: number // radians, half-angle
  range: number // px
  criticalChance: number // 0..1
  criticalMultiplier: number
  recoil: number // visual kick strength
  pellets: number // projectiles fired per trigger pull (shotgun-style spread)
  pierceCount?: number // extra enemies a single projectile can pass through
  explosionRadius?: number // area-damage radius on impact (rockets)
}

export interface WeaponState {
  ammoInMag: number
  fireCooldown: number
  reloading: boolean
  reloadRemaining: number
}

export type EnemyBehavior = 'melee' | 'ranged' | 'stalker' | 'boss'

export interface EnemyDefinition {
  id: string
  name: string
  health: number
  speed: number // px/sec
  contactDamage: number
  contactCooldown: number // seconds between contact-damage ticks
  radius: number
  color: string
  xpValue: number
  behavior: EnemyBehavior
  // ranged behavior (Spitter): kites at range and fires EnemyProjectiles
  preferredRange?: number
  rangedDamage?: number
  rangedCooldown?: number // seconds between shots
  rangedProjectileSpeed?: number // px/sec
  // orthogonal to behavior (Exploder): detonates on contact or death instead
  // of dealing a normal damage tick
  explosionDamage?: number
  explosionRadius?: number
  // stalker behavior: alternates between a visible approach and a cloaked,
  // untargetable dash straight at the player
  visibleDuration?: number
  cloakDuration?: number
  cloakSpeedMultiplier?: number
  // boss behavior: cycles idle -> telegraph -> attack through a fixed rotation
  // of slam / charge / barrage attacks, each one clearly telegraphed first
  bossAttackInterval?: number // seconds spent idle/chasing between attacks
  bossTelegraphDuration?: number // seconds the attack is telegraphed before it fires
  bossSlamDamage?: number
  bossSlamRadius?: number
  bossChargeSpeedMultiplier?: number // multiplies def.speed for the charge dash
  bossChargeDuration?: number
  bossBarrageCount?: number
  bossBarrageDamage?: number
  bossBarrageProjectileSpeed?: number
}

export interface PlayerUpgrades {
  damageMultiplier: number
  fireRateMultiplier: number
  reloadSpeedMultiplier: number
  critChanceBonus: number
  moveSpeedMultiplier: number
  xpGainMultiplier: number
}

export interface AbilityDefinition {
  id: string
  name: string
  key: string // display key hint, e.g. 'SHIFT'
  cooldown: number // seconds
  duration?: number // seconds; present for buff/channel abilities (Overcharge)
}

export interface AbilityState {
  cooldownRemaining: number
  activeRemaining: number // >0 while a duration-based effect is in effect
}

export interface Player {
  position: Vector2
  velocity: Vector2
  rotation: number
  radius: number
  health: number
  maxHealth: number
  armor: number
  maxArmor: number
  xp: number
  level: number
  xpToNext: number
  weapons: Record<string, WeaponState>
  equippedWeaponId: string
  upgrades: PlayerUpgrades
  abilities: Record<string, AbilityState>
  dashInvulnerableTimer: number
  alive: boolean
}

export type BossPhase = 'idle' | 'telegraph' | 'attack'
export type BossAttackId = 'slam' | 'charge' | 'barrage'

export interface Enemy {
  id: number
  defId: string
  position: Vector2
  velocity: Vector2
  health: number
  maxHealth: number
  alive: boolean
  hitFlash: number
  attackCooldown: number
  rangedCooldown: number
  cloaked: boolean
  phaseTimer: number
  bossPhase: BossPhase
  bossAttackId: BossAttackId | null
  bossTimer: number
  bossLockedDir: Vector2
}

export interface Projectile {
  id: number
  position: Vector2
  velocity: Vector2
  damage: number
  isCrit: boolean
  radius: number
  distanceRemaining: number
  pierceRemaining: number
  explosionRadius?: number
}

/** A hostile projectile fired by a ranged enemy (Spitter) at the player. */
export interface EnemyProjectile {
  id: number
  position: Vector2
  velocity: Vector2
  damage: number
  radius: number
  distanceRemaining: number
}

/** A player-thrown grenade (ability): rolls to a stop, then detonates on fuse expiry. */
export interface Grenade {
  id: number
  position: Vector2
  velocity: Vector2
  fuseRemaining: number
  explosionRadius: number
  damage: number
}

export type ParticleKind =
  | 'muzzle'
  | 'impact'
  | 'damageText'
  | 'death'
  | 'shell'
  | 'hitmarker'
  | 'spawnRing'
  | 'explosion'

export interface Particle {
  id: number
  kind: ParticleKind
  position: Vector2
  velocity: Vector2
  age: number
  ttl: number
  text?: string
  color: string
  crit?: boolean
}

export interface WaveDefinition {
  waveNumber: number
  spawns: { defId: string; count: number }[]
  spawnIntervalMs: number
}

export interface Obstacle {
  position: Vector2
  radius: number
}

export interface MapDefinition {
  id: string
  name: string
  obstacles: Obstacle[]
}

export interface WaveState {
  waveIndex: number
  spawnQueue: string[]
  spawnTimer: number
  enemiesAlive: number
  waveInProgress: boolean
}

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  aimX: number
  aimY: number
  firing: boolean
  switchTo: string | null
  abilityTrigger: string | null
}

export interface EngineStats {
  kills: number
  shotsFired: number
  shotsHit: number
  survivalTime: number
  waveReached: number
}

export type EngineEventType =
  | 'shotFired'
  | 'hit'
  | 'critHit'
  | 'enemyDeath'
  | 'reloadStart'
  | 'reloadComplete'
  | 'playerHit'
  | 'enemySpawn'
  | 'explosion'
  | 'weaponSwitch'
  | 'enemySpit'
  | 'levelUp'
  | 'upgradeChosen'
  | 'dashUsed'
  | 'grenadeThrown'
  | 'overchargeActivated'
  | 'bossSpawn'
  | 'bossSlam'
  | 'bossCharge'
  | 'bossBarrage'
  | 'bossDefeated'

export interface EngineEvent {
  type: EngineEventType
}

export interface AbilityHudInfo {
  id: string
  name: string
  key: string
  cooldown: number
  cooldownRemaining: number
  active: boolean
}

export interface BossHudInfo {
  name: string
  health: number
  maxHealth: number
  attackTelegraph: BossAttackId | null
}

export interface HudSnapshot {
  status: GameStatus
  health: number
  maxHealth: number
  armor: number
  maxArmor: number
  ammoInMag: number
  magazineSize: number
  reloading: boolean
  weaponName: string
  weaponIndex: number
  waveNumber: number
  enemiesAlive: number
  xp: number
  xpToNext: number
  level: number
  survivalTime: number
  kills: number
  abilities: AbilityHudInfo[]
  boss: BossHudInfo | null
  mapName: string
}
