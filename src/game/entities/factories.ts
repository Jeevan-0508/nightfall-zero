import type {
  AbilityDefinition,
  AbilityState,
  Enemy,
  EnemyDefinition,
  EnemyProjectile,
  Grenade,
  Player,
  PlayerUpgrades,
  WeaponDefinition,
  WeaponState,
} from '../engine/types'
import type { Vector2 } from '../engine/vector'
import type { Rng } from '../engine/rng'

/** Elite spawns start appearing from wave 3, ramping to a 22% cap by wave 12+. Tougher and harder-hitting, worth more XP on the kill. */
export const ELITE_HEALTH_MULTIPLIER = 1.5
export const ELITE_DAMAGE_MULTIPLIER = 1.35
export const ELITE_XP_MULTIPLIER = 1.8

export function eliteChanceForWave(waveNumber: number): number {
  if (waveNumber <= 2) return 0
  return Math.min(0.22, 0.04 * (waveNumber - 2))
}

export function rollElite(rng: Rng, waveNumber: number): boolean {
  return rng() < eliteChanceForWave(waveNumber)
}

let enemyIdCounter = 0

function freshWeaponState(def: WeaponDefinition): WeaponState {
  return {
    ammoInMag: def.magazineSize,
    fireCooldown: 0,
    reloading: false,
    reloadRemaining: 0,
  }
}

export function createDefaultUpgrades(): PlayerUpgrades {
  return {
    damageMultiplier: 1,
    fireRateMultiplier: 1,
    reloadSpeedMultiplier: 1,
    critChanceBonus: 0,
    moveSpeedMultiplier: 1,
    xpGainMultiplier: 1,
    critDamageMultiplier: 1,
  }
}

export function createPlayer(
  position: Vector2,
  availableWeapons: WeaponDefinition[],
  equippedWeaponId: string,
  availableAbilities: AbilityDefinition[] = [],
): Player {
  const weaponStates: Record<string, WeaponState> = {}
  for (const def of availableWeapons) weaponStates[def.id] = freshWeaponState(def)

  const abilityStates: Record<string, AbilityState> = {}
  for (const def of availableAbilities) abilityStates[def.id] = { cooldownRemaining: 0, activeRemaining: 0 }

  return {
    position: { ...position },
    velocity: { x: 0, y: 0 },
    rotation: 0,
    radius: 16,
    health: 100,
    maxHealth: 100,
    armor: 50,
    maxArmor: 100,
    xp: 0,
    level: 1,
    xpToNext: 100,
    weapons: weaponStates,
    equippedWeaponId,
    upgrades: createDefaultUpgrades(),
    abilities: abilityStates,
    dashInvulnerableTimer: 0,
    alive: true,
  }
}

export function createEnemy(def: EnemyDefinition, position: Vector2, elite = false): Enemy {
  const healthScale = elite ? ELITE_HEALTH_MULTIPLIER : 1
  enemyIdCounter += 1
  return {
    id: enemyIdCounter,
    defId: def.id,
    position: { ...position },
    velocity: { x: 0, y: 0 },
    health: def.health * healthScale,
    maxHealth: def.health * healthScale,
    alive: true,
    hitFlash: 0,
    attackCooldown: 0,
    rangedCooldown: 0,
    cloaked: false,
    phaseTimer: def.behavior === 'stalker' ? (def.visibleDuration ?? 2.2) : 0,
    bossPhase: 'idle',
    bossAttackId: null,
    bossTimer: def.behavior === 'boss' ? (def.bossAttackInterval ?? 3.5) : 0,
    bossLockedDir: { x: 0, y: 0 },
    elite,
  }
}

export function resetEnemyIdCounter(): void {
  enemyIdCounter = 0
}

let enemyProjectileIdCounter = 0

export function createEnemyProjectile(
  position: Vector2,
  velocity: Vector2,
  damage: number,
  range: number,
): EnemyProjectile {
  enemyProjectileIdCounter += 1
  return {
    id: enemyProjectileIdCounter,
    position: { ...position },
    velocity,
    damage,
    radius: 5,
    distanceRemaining: range,
  }
}

export function resetEnemyProjectileIdCounter(): void {
  enemyProjectileIdCounter = 0
}

let grenadeIdCounter = 0

export function createGrenade(
  position: Vector2,
  velocity: Vector2,
  damage: number,
  explosionRadius: number,
  fuse: number,
): Grenade {
  grenadeIdCounter += 1
  return {
    id: grenadeIdCounter,
    position: { ...position },
    velocity,
    fuseRemaining: fuse,
    explosionRadius,
    damage,
  }
}

export function resetGrenadeIdCounter(): void {
  grenadeIdCounter = 0
}
