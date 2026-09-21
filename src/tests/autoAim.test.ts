import { describe, expect, it } from 'vitest'
import { findNearestAliveEnemy } from '../game/combat/autoAim'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'

describe('findNearestAliveEnemy', () => {
  it('returns null when there are no enemies', () => {
    expect(findNearestAliveEnemy([], { x: 0, y: 0 })).toBeNull()
  })

  it('returns null when every enemy is dead', () => {
    const dead = createEnemy(walker, { x: 10, y: 0 })
    dead.alive = false
    expect(findNearestAliveEnemy([dead], { x: 0, y: 0 })).toBeNull()
  })

  it('picks the closest alive enemy over a farther one', () => {
    const near = createEnemy(walker, { x: 50, y: 0 })
    const far = createEnemy(walker, { x: 500, y: 0 })
    expect(findNearestAliveEnemy([far, near], { x: 0, y: 0 })).toBe(near)
  })

  it('skips a dead enemy even if it is the physically closest one', () => {
    const closeButDead = createEnemy(walker, { x: 10, y: 0 })
    closeButDead.alive = false
    const aliveFarther = createEnemy(walker, { x: 200, y: 0 })
    expect(findNearestAliveEnemy([closeButDead, aliveFarther], { x: 0, y: 0 })).toBe(aliveFarther)
  })

  it('measures true Euclidean distance, not just one axis', () => {
    const straightLine = createEnemy(walker, { x: 100, y: 0 })
    const diagonalButCloser = createEnemy(walker, { x: 40, y: 40 })
    expect(findNearestAliveEnemy([straightLine, diagonalButCloser], { x: 0, y: 0 })).toBe(diagonalButCloser)
  })
})
