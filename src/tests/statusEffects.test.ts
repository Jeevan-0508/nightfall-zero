import { describe, expect, it } from 'vitest'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import {
  applyStatus,
  tickStatuses,
  getSlowMultiplier,
  getDamageTakenMultiplier,
  hasStatus,
  BURN_DPS,
  BURN_DURATION,
  SLOW_MULTIPLIER,
  SLOW_DURATION,
  MARK_MULTIPLIER,
  MARK_DURATION,
} from '../game/combat/statusEffects'

describe('applyStatus / hasStatus', () => {
  it('adds a new status that was not present', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    expect(hasStatus(enemy, 'burn')).toBe(false)
    applyStatus(enemy, 'burn', BURN_DURATION, BURN_DPS)
    expect(hasStatus(enemy, 'burn')).toBe(true)
    expect(enemy.statuses).toHaveLength(1)
  })

  it('refreshes duration/magnitude instead of stacking a second copy', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'burn', 1, 5)
    applyStatus(enemy, 'burn', BURN_DURATION, BURN_DPS)
    expect(enemy.statuses).toHaveLength(1)
    expect(enemy.statuses[0].remaining).toBe(BURN_DURATION)
    expect(enemy.statuses[0].magnitude).toBe(BURN_DPS)
  })

  it('tracks independent status types at once', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'burn', BURN_DURATION, BURN_DPS)
    applyStatus(enemy, 'slow', SLOW_DURATION, SLOW_MULTIPLIER)
    applyStatus(enemy, 'mark', MARK_DURATION, MARK_MULTIPLIER)
    expect(enemy.statuses).toHaveLength(3)
  })
})

describe('tickStatuses', () => {
  it('returns dps*dt burn damage while active', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'burn', BURN_DURATION, BURN_DPS)
    const damage = tickStatuses(enemy, 0.5)
    expect(damage).toBeCloseTo(BURN_DPS * 0.5)
  })

  it('expires a status once remaining drops to zero', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'slow', 0.4, SLOW_MULTIPLIER)
    tickStatuses(enemy, 0.5)
    expect(hasStatus(enemy, 'slow')).toBe(false)
    expect(enemy.statuses).toHaveLength(0)
  })

  it('does not report burn damage for a non-burn status', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'mark', MARK_DURATION, MARK_MULTIPLIER)
    const damage = tickStatuses(enemy, 1)
    expect(damage).toBe(0)
  })

  it('is a no-op with zero statuses', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    expect(tickStatuses(enemy, 1)).toBe(0)
    expect(enemy.statuses).toHaveLength(0)
  })
})

describe('getSlowMultiplier', () => {
  it('is 1 with no active slow', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    expect(getSlowMultiplier(enemy)).toBe(1)
  })

  it('applies the slow magnitude while active', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'slow', SLOW_DURATION, SLOW_MULTIPLIER)
    expect(getSlowMultiplier(enemy)).toBe(SLOW_MULTIPLIER)
  })

  it('ignores burn/mark statuses', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'burn', BURN_DURATION, BURN_DPS)
    applyStatus(enemy, 'mark', MARK_DURATION, MARK_MULTIPLIER)
    expect(getSlowMultiplier(enemy)).toBe(1)
  })
})

describe('getDamageTakenMultiplier', () => {
  it('is 1 with no active mark', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    expect(getDamageTakenMultiplier(enemy)).toBe(1)
  })

  it('applies the mark magnitude while active', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'mark', MARK_DURATION, MARK_MULTIPLIER)
    expect(getDamageTakenMultiplier(enemy)).toBe(MARK_MULTIPLIER)
  })

  it('ignores burn/slow statuses', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    applyStatus(enemy, 'burn', BURN_DURATION, BURN_DPS)
    applyStatus(enemy, 'slow', SLOW_DURATION, SLOW_MULTIPLIER)
    expect(getDamageTakenMultiplier(enemy)).toBe(1)
  })
})
