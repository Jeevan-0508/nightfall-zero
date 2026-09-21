import { describe, expect, it } from 'vitest'
import { circlesIntersect, sweepIntersectsCircle } from '../game/collision/collision'

describe('circlesIntersect', () => {
  it('returns true when circles overlap', () => {
    expect(circlesIntersect({ x: 0, y: 0 }, 10, { x: 15, y: 0 }, 10)).toBe(true)
  })

  it('returns false when circles are far apart', () => {
    expect(circlesIntersect({ x: 0, y: 0 }, 5, { x: 100, y: 0 }, 5)).toBe(false)
  })

  it('treats exact touching distance as intersecting', () => {
    expect(circlesIntersect({ x: 0, y: 0 }, 5, { x: 10, y: 0 }, 5)).toBe(true)
  })
})

describe('sweepIntersectsCircle', () => {
  it('catches a fast projectile that would tunnel clean through a small target this frame', () => {
    // A sniper-speed bullet (1400px/s at 1/60s dt) travels ~23px in one tick, passing directly
    // over a target whose center sits closer to the middle of that path than to either endpoint -
    // neither the start point nor the end point alone overlaps it, but the path between them does.
    const from = { x: -11.5, y: 10 }
    const to = { x: 11.5, y: 10 }
    const target = { x: 0, y: 0 }
    expect(circlesIntersect(from, 4, target, 11)).toBe(false)
    expect(circlesIntersect(to, 4, target, 11)).toBe(false)
    expect(sweepIntersectsCircle(from, to, 4, target, 11)).toBe(true)
  })

  it('returns false when the whole swept path stays clear of the target', () => {
    const from = { x: -11.5, y: 100 }
    const to = { x: 11.5, y: 100 }
    const target = { x: 0, y: 0 }
    expect(sweepIntersectsCircle(from, to, 4, target, 11)).toBe(false)
  })

  it('falls back to a plain circle check for a stationary (zero-length) sweep', () => {
    const point = { x: 5, y: 5 }
    expect(sweepIntersectsCircle(point, point, 4, { x: 5, y: 5 }, 11)).toBe(true)
    expect(sweepIntersectsCircle(point, point, 4, { x: 500, y: 500 }, 11)).toBe(false)
  })
})
