import type { Enemy, EnemyDefinition, Player } from '../engine/types'
import { normalize, subtract, scale, distance } from '../engine/vector'

/**
 * Simple pursuit + separation steering. Enemies chase the player directly
 * (Phase 1 baseline) but push off each other so they don't fully stack,
 * which already reads as distinct behavior between Walker/Runner/Brute
 * purely from their speed/radius stats.
 */
export function updateEnemyMovement(
  enemy: Enemy,
  def: EnemyDefinition,
  player: Player,
  others: Enemy[],
  dt: number,
): void {
  const toPlayer = subtract(player.position, enemy.position)
  const distToPlayer = distance(enemy.position, player.position)
  const minDistance = enemy.attackCooldown > 0 ? 0 : def.radius + player.radius - 2

  let moveDir = { x: 0, y: 0 }
  if (distToPlayer > minDistance) {
    moveDir = normalize(toPlayer)
  }

  let separation = { x: 0, y: 0 }
  for (const other of others) {
    if (other.id === enemy.id || !other.alive) continue
    const d = distance(enemy.position, other.position)
    const combinedRadius = def.radius + 12
    if (d > 0 && d < combinedRadius) {
      const push = normalize(subtract(enemy.position, other.position))
      separation = { x: separation.x + push.x, y: separation.y + push.y }
    }
  }

  const combined = normalize({
    x: moveDir.x + separation.x * 0.6,
    y: moveDir.y + separation.y * 0.6,
  })

  enemy.velocity = scale(combined, def.speed)
  enemy.position = {
    x: enemy.position.x + enemy.velocity.x * dt,
    y: enemy.position.y + enemy.velocity.y * dt,
  }

  if (enemy.attackCooldown > 0) {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt)
  }
  if (enemy.hitFlash > 0) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt)
  }
}
