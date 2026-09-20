import type { Enemy, EnemyDefinition, EnemyProjectile, Player } from '../engine/types'
import { distance, normalize, scale, subtract } from '../engine/vector'
import { createEnemyProjectile } from '../entities/factories'

/**
 * Fires a Spitter-style projectile at the player if the enemy is a ranged
 * shooter, off cooldown, and roughly within its preferred range. Mutates
 * `enemy.rangedCooldown` as a side effect (mirrors `tryFire`'s pattern for
 * the player's weapon timers).
 */
export function tryRangedAttack(enemy: Enemy, def: EnemyDefinition, player: Player): EnemyProjectile | null {
  if (def.behavior !== 'ranged') return null
  if (enemy.rangedCooldown > 0) return null

  const dist = distance(enemy.position, player.position)
  const maxRange = (def.preferredRange ?? 250) + 60
  if (dist > maxRange) return null

  enemy.rangedCooldown = def.rangedCooldown ?? 1.5
  const direction = normalize(subtract(player.position, enemy.position))
  return createEnemyProjectile(
    enemy.position,
    scale(direction, def.rangedProjectileSpeed ?? 220),
    def.rangedDamage ?? 10,
    maxRange + 40,
  )
}
