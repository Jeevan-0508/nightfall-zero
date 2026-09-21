import type { Vector2 } from '../engine/vector'

export interface SpatialEntry {
  position: Vector2
}

/**
 * Uniform grid broad-phase index shared by enemy separation and projectile-hit
 * resolution, so neither has to linear-scan every other entity every frame.
 * Rebuilt fresh each time it's needed (O(n) insert), then queried with
 * `queryRadius` (O(entities in nearby cells) instead of O(n)).
 */
export class SpatialGrid<T extends SpatialEntry> {
  private readonly cellSize: number
  private readonly buckets = new Map<string, T[]>()

  constructor(cellSize: number) {
    this.cellSize = cellSize
  }

  private cellKey(cx: number, cy: number): string {
    return `${cx},${cy}`
  }

  private cellOf(position: Vector2): { cx: number; cy: number } {
    return { cx: Math.floor(position.x / this.cellSize), cy: Math.floor(position.y / this.cellSize) }
  }

  clear(): void {
    this.buckets.clear()
  }

  insert(entry: T): void {
    const { cx, cy } = this.cellOf(entry.position)
    const key = this.cellKey(cx, cy)
    const bucket = this.buckets.get(key)
    if (bucket) {
      bucket.push(entry)
    } else {
      this.buckets.set(key, [entry])
    }
  }

  /** Clears and re-inserts every entry; the usual way to keep the grid in sync with a frame's positions. */
  rebuild(entries: readonly T[]): void {
    this.clear()
    for (const entry of entries) this.insert(entry)
  }

  /**
   * Returns every entry in the cells overlapping a `radius` around `position`.
   * This is a broad-phase result (square neighborhood, not an exact circle),
   * so callers must still do their own precise distance/radius check.
   */
  queryRadius(position: Vector2, radius: number): T[] {
    const results: T[] = []
    const { cx, cy } = this.cellOf(position)
    const reach = Math.max(1, Math.ceil(radius / this.cellSize))
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        const bucket = this.buckets.get(this.cellKey(cx + dx, cy + dy))
        if (!bucket) continue
        for (const entry of bucket) results.push(entry)
      }
    }
    return results
  }
}
