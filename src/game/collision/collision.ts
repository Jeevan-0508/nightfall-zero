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
 * Swept-circle-vs-circle test: true if a circle of `radius` moving from `from` to `to` ever comes
 * within `targetRadius` of `targetCenter`. A same-frame current-position-only check can miss a fast
 * projectile that crossed straight through a target between two ticks (tunneling); this checks the
 * whole path travelled this frame instead of just its endpoint.
 */
export function sweepIntersectsCircle(
  from: Vector2,
  to: Vector2,
  radius: number,
  targetCenter: Vector2,
  targetRadius: number,
): boolean {
  const combined = radius + targetRadius
  const pathX = to.x - from.x
  const pathY = to.y - from.y
  const pathLengthSq = pathX * pathX + pathY * pathY
  if (pathLengthSq === 0) {
    return circlesIntersect(from, radius, targetCenter, targetRadius)
  }
  let t = ((targetCenter.x - from.x) * pathX + (targetCenter.y - from.y) * pathY) / pathLengthSq
  t = Math.max(0, Math.min(1, t))
  const closestX = from.x + t * pathX
  const closestY = from.y + t * pathY
  const dx = targetCenter.x - closestX
  const dy = targetCenter.y - closestY
  return dx * dx + dy * dy <= combined * combined
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
