import type { Enemy, StatusEffectType } from '../engine/types'

/**
 * Small, deterministic status system: three timed debuffs, each with one
 * clear trigger elsewhere in combat (burn <- flamethrower, slow <- crit
 * stagger, mark <- explosion survivors). Reapplying a type refreshes it to
 * the new duration/magnitude instead of stacking, so effects stay readable
 * and bounded regardless of how many hits land while one is already active.
 */

export const BURN_DPS = 8
export const BURN_DURATION = 3
export const SLOW_MULTIPLIER = 0.5
export const SLOW_DURATION = 0.4
export const MARK_MULTIPLIER = 1.25
export const MARK_DURATION = 4

/** Applies or refreshes a status on the enemy. */
export function applyStatus(enemy: Enemy, type: StatusEffectType, duration: number, magnitude: number): void {
  const existing = enemy.statuses.find((s) => s.type === type)
  if (existing) {
    existing.remaining = duration
    existing.magnitude = magnitude
    return
  }
  enemy.statuses.push({ type, remaining: duration, magnitude })
}

/** Advances every active status by `dt`, dropping expired ones, and returns this tick's total burn damage. */
export function tickStatuses(enemy: Enemy, dt: number): number {
  let burnDamage = 0
  for (const status of enemy.statuses) {
    status.remaining -= dt
    if (status.type === 'burn') burnDamage += status.magnitude * dt
  }
  enemy.statuses = enemy.statuses.filter((s) => s.remaining > 0)
  return burnDamage
}

export function hasStatus(enemy: Enemy, type: StatusEffectType): boolean {
  return enemy.statuses.some((s) => s.type === type)
}

/** Product of every active slow's speed multiplier (1 = unaffected). Bosses opt out by never receiving 'slow'. */
export function getSlowMultiplier(enemy: Enemy): number {
  let multiplier = 1
  for (const status of enemy.statuses) {
    if (status.type === 'slow') multiplier *= status.magnitude
  }
  return multiplier
}

/** Product of every active mark's damage-taken multiplier (1 = unaffected). */
export function getDamageTakenMultiplier(enemy: Enemy): number {
  let multiplier = 1
  for (const status of enemy.statuses) {
    if (status.type === 'mark') multiplier *= status.magnitude
  }
  return multiplier
}
