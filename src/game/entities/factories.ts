import type { EnemyDefinition, Enemy, Player, WeaponDefinition } from '../engine/types'
import type { Vector2 } from '../engine/vector'

let enemyIdCounter = 0

export function createPlayer(position: Vector2, weapon: WeaponDefinition): Player {
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
    weapon: {
      defId: weapon.id,
      ammoInMag: weapon.magazineSize,
      fireCooldown: 0,
      reloading: false,
      reloadRemaining: 0,
    },
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
  }
}

export function resetEnemyIdCounter(): void {
  enemyIdCounter = 0
}
