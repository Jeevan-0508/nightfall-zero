import type { Rng } from '../engine/rng'
import { chance } from '../engine/rng'
import type { WeaponDefinition } from '../engine/types'

export interface DamageRoll {
  amount: number
  isCrit: boolean
}

export function rollWeaponDamage(weapon: WeaponDefinition, rng: Rng): DamageRoll {
  const isCrit = chance(rng, weapon.criticalChance)
  const amount = isCrit ? weapon.damage * weapon.criticalMultiplier : weapon.damage
  return { amount, isCrit }
}

/** Returns true if the target's health drops to zero or below (i.e. it dies). */
export function applyDamage(target: { health: number }, amount: number): boolean {
  target.health -= amount
  return target.health <= 0
}
