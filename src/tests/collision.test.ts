import { describe, expect, it } from 'vitest'
import { circlesIntersect } from '../game/collision/collision'

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
