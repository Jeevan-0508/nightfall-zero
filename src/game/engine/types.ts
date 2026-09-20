import type { Vector2 } from './vector'

export const ARENA_WIDTH = 960
export const ARENA_HEIGHT = 600

export type GameStatus = 'playing' | 'dead'

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
}

export interface WeaponState {
  defId: string
  ammoInMag: number
  fireCooldown: number
  reloading: boolean
  reloadRemaining: number
}

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
  weapon: WeaponState
  alive: boolean
}

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
}

export interface Projectile {
  id: number
  position: Vector2
  velocity: Vector2
  damage: number
  isCrit: boolean
  radius: number
  distanceRemaining: number
}

export type ParticleKind = 'muzzle' | 'impact' | 'damageText' | 'death'

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
}

export interface EngineStats {
  kills: number
  shotsFired: number
  shotsHit: number
  survivalTime: number
  waveReached: number
}

export interface EngineSnapshot {
  status: GameStatus
  player: Player
  enemies: Enemy[]
  projectiles: Projectile[]
  particles: Particle[]
  wave: WaveState
  stats: EngineStats
  screenShake: number
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
  waveNumber: number
  enemiesAlive: number
  xp: number
  xpToNext: number
  level: number
  survivalTime: number
  kills: number
}
