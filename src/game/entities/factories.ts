import type { EnemyDefinition, Enemy, EnemyProjectile, Player, WeaponDefinition, WeaponState } from '../engine/types'
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

export function createPlayer(
  position: Vector2,
  availableWeapons: WeaponDefinition[],
  equippedWeaponId: string,
): Player {
  const weaponStates: Record<string, WeaponState> = {}
  for (const def of availableWeapons) weaponStates[def.id] = freshWeaponState(def)

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
