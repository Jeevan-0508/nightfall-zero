import type { Enemy, EliteModifier } from '../engine/types'
import type { Rng } from '../engine/rng'
import { rangeFloat } from '../engine/rng'
import { hasStatus } from './statusEffects'

/**
 * Elite modifiers, not new enemy classes: a roster enemy that rolls elite
 * gets exactly one of these six flavors layered on top of the existing
 * HP/damage/XP elite bonus (ELITE_*_MULTIPLIER in factories.ts). Kept to six
 * bounded, deterministic mechanics rather than a stacking-modifier system.
 */
export const ELITE_MODIFIERS: EliteModifier[] = ['armored', 'frenzied', 'regenerating', 'shielded', 'explosive', 'teleporting']

export const ARMORED_DAMAGE_MULTIPLIER = 0.55 // non-crit hits only
export const FRENZIED_SPEED_MULTIPLIER = 1.45
export const REGEN_RATE = 0.02 // fraction of maxHealth healed per second
export const SHIELD_CAPACITY = 40
export const EXPLOSIVE_DAMAGE = 30
export const EXPLOSIVE_RADIUS = 75
export const TELEPORT_INTERVAL = 5
export const TELEPORT_WARNING_DURATION = 0.5

/** Uniform pick among the six modifiers, seeded off the run's own rng so elite flavor stays reproducible. */
export function rollEliteModifier(rng: Rng): EliteModifier {
  const index = Math.min(ELITE_MODIFIERS.length - 1, Math.floor(rangeFloat(rng, 0, ELITE_MODIFIERS.length)))
  return ELITE_MODIFIERS[index]
}

export function getEliteSpeedMultiplier(enemy: Enemy): number {
  return enemy.eliteModifier === 'frenzied' ? FRENZIED_SPEED_MULTIPLIER : 1
}

/** Armor reduces normal damage, but a critical hit always bypasses it - the "crit build vs Armored elite" interaction. */
export function getArmorMultiplier(enemy: Enemy, isCrit: boolean): number {
  if (enemy.eliteModifier === 'armored' && !isCrit) return ARMORED_DAMAGE_MULTIPLIER
  return 1
}

/** Depletes the shield pool before any damage reaches health. Returns the leftover damage (0 if fully absorbed) and whether this hit broke the shield. */
export function absorbShield(enemy: Enemy, damage: number): { remainingDamage: number; justBroke: boolean } {
  if (enemy.eliteModifier !== 'shielded' || enemy.shieldRemaining <= 0) {
    return { remainingDamage: damage, justBroke: false }
  }
  const absorbed = Math.min(enemy.shieldRemaining, damage)
  enemy.shieldRemaining -= absorbed
  return { remainingDamage: damage - absorbed, justBroke: enemy.shieldRemaining <= 0 }
}

/** Heals a Regenerating elite over time. Burn suppresses regen entirely - the "burn build vs Regenerator" interaction. */
export function tickEliteRegen(enemy: Enemy, dt: number): void {
  if (enemy.eliteModifier !== 'regenerating') return
  if (hasStatus(enemy, 'burn')) return
  if (enemy.health >= enemy.maxHealth) return
  enemy.health = Math.min(enemy.maxHealth, enemy.health + enemy.maxHealth * REGEN_RATE * dt)
}

/** Counts down to the next teleport and flags a brief warning window beforehand. Returns true on the exact tick a teleport should fire. */
export function tickEliteTeleport(enemy: Enemy, dt: number): boolean {
  if (enemy.eliteModifier !== 'teleporting') return false
  enemy.teleportTimer -= dt
  enemy.teleportWarning = enemy.teleportTimer <= TELEPORT_WARNING_DURATION
  if (enemy.teleportTimer > 0) return false
  enemy.teleportTimer = TELEPORT_INTERVAL
  enemy.teleportWarning = false
  return true
}
