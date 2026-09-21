import type { Enemy } from '../engine/types'
import type { Vector2 } from '../engine/vector'

/** Manual mouse aim always wins over this - it's only ever read by the input layer when the
 * mouse has gone idle for a moment, so it just has to answer one question: who's closest. */
export function findNearestAliveEnemy(enemies: Enemy[], from: Vector2): Enemy | null {
  let nearest: Enemy | null = null
  let nearestDistSq = Infinity
  for (const enemy of enemies) {
    if (!enemy.alive) continue
    const dx = enemy.position.x - from.x
    const dy = enemy.position.y - from.y
    const distSq = dx * dx + dy * dy
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq
      nearest = enemy
    }
  }
  return nearest
}
