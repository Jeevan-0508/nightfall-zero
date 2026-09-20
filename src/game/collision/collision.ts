import type { Obstacle } from '../engine/types'
import type { Vector2 } from '../engine/vector'
import { distance, subtract } from '../engine/vector'

export function circlesIntersect(
  posA: Vector2,
  radiusA: number,
  posB: Vector2,
  radiusB: number,
): boolean {
  return distance(posA, posB) <= radiusA + radiusB
}

export function circleIntersectsAnyObstacle(position: Vector2, radius: number, obstacles: Obstacle[]): boolean {
  return obstacles.some((o) => circlesIntersect(position, radius, o.position, o.radius))
}

/**
 * Obstacles are solid: pushes `position` back out to the nearest point on an
 * overlapping obstacle's edge, so movement never tunnels through terrain.
 * Player, enemies, and the boss all funnel through this one function.
 */
export function resolveObstacleCollisions(position: Vector2, radius: number, obstacles: Obstacle[]): Vector2 {
  let resolved = position
  for (const obstacle of obstacles) {
    const delta = subtract(resolved, obstacle.position)
    const dist = distance(resolved, obstacle.position)
    const minDist = radius + obstacle.radius
    if (dist < minDist) {
      const pushDir = dist > 0 ? { x: delta.x / dist, y: delta.y / dist } : { x: 1, y: 0 }
      resolved = {
        x: obstacle.position.x + pushDir.x * minDist,
        y: obstacle.position.y + pushDir.y * minDist,
      }
    }
  }
  return resolved
}
