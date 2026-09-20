import type { Vector2 } from '../engine/vector'
import { distance } from '../engine/vector'

export function circlesIntersect(
  posA: Vector2,
  radiusA: number,
  posB: Vector2,
  radiusB: number,
): boolean {
  return distance(posA, posB) <= radiusA + radiusB
}
