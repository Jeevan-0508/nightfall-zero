import { describe, expect, it } from 'vitest'
import { SpatialGrid } from '../game/collision/spatialGrid'

interface Entry {
  id: number
  position: { x: number; y: number }
}

describe('SpatialGrid', () => {
  it('returns nothing from an empty grid', () => {
    const grid = new SpatialGrid<Entry>(50)
    expect(grid.queryRadius({ x: 0, y: 0 }, 100)).toEqual([])
  })

  it('finds an entry inserted into the same cell', () => {
    const grid = new SpatialGrid<Entry>(50)
    const entry: Entry = { id: 1, position: { x: 10, y: 10 } }
    grid.insert(entry)
    expect(grid.queryRadius({ x: 12, y: 12 }, 20)).toContain(entry)
  })

  it('finds an entry across a cell boundary within the search radius', () => {
    const grid = new SpatialGrid<Entry>(50)
    // Cell size 50: (49, 0) and (51, 0) fall in adjacent cells but are 2px apart.
    const near = { id: 1, position: { x: 49, y: 0 } }
    grid.insert(near)
    const results = grid.queryRadius({ x: 51, y: 0 }, 10)
    expect(results).toContain(near)
  })

  it('does not return entries far outside the search radius', () => {
    const grid = new SpatialGrid<Entry>(50)
    const far: Entry = { id: 1, position: { x: 1000, y: 1000 } }
    grid.insert(far)
    expect(grid.queryRadius({ x: 0, y: 0 }, 50)).toEqual([])
  })

  it('rebuild clears previous contents before inserting the new set', () => {
    const grid = new SpatialGrid<Entry>(50)
    grid.insert({ id: 1, position: { x: 0, y: 0 } })
    grid.rebuild([{ id: 2, position: { x: 0, y: 0 } }])
    const results = grid.queryRadius({ x: 0, y: 0 }, 10)
    expect(results).toHaveLength(1)
    expect(results[0]!.id).toBe(2)
  })

  it('matches a brute-force scan for a scattered set of entries', () => {
    const grid = new SpatialGrid<Entry>(48)
    const entries: Entry[] = []
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2
      entries.push({ id: i, position: { x: 300 + Math.cos(angle) * (i % 5) * 40, y: 300 + Math.sin(angle) * (i % 5) * 40 } })
    }
    grid.rebuild(entries)

    const probe = { x: 320, y: 310 }
    const radius = 60
    const bruteForce = entries.filter(
      (e) => Math.hypot(e.position.x - probe.x, e.position.y - probe.y) <= radius,
    )
    const gridResult = grid.queryRadius(probe, radius).filter(
      (e) => Math.hypot(e.position.x - probe.x, e.position.y - probe.y) <= radius,
    )
    expect(gridResult.map((e) => e.id).sort()).toEqual(bruteForce.map((e) => e.id).sort())
  })
})
