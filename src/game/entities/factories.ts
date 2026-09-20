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

export function createEnemy(def: EnemyDefinition, position: Vector2): Enemy {
  enemyIdCounter += 1
  return {
    id: enemyIdCounter,
    defId: def.id,
    position: { ...position },
    velocity: { x: 0, y: 0 },
    health: def.health,
    maxHealth: def.health,
    alive: true,
    hitFlash: 0,
    attackCooldown: 0,
    rangedCooldown: 0,
    cloaked: false,
    phaseTimer: def.behavior === 'stalker' ? (def.visibleDuration ?? 2.2) : 0,
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
