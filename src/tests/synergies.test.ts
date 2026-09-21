import { describe, expect, it } from 'vitest'
import {
  EMPTY_THEME_STACKS,
  SYNERGY_THRESHOLD,
  getThemeStacks,
  isSynergyActive,
  getCritSynergyMultiplier,
  getMobilitySynergyMultiplier,
  getFireSynergyMultiplier,
  getExplosiveSynergyDamageMultiplier,
  getExplosiveSynergyRadiusMultiplier,
  getEnergySynergyPierceBonus,
  CRIT_SYNERGY_DAMAGE_MULTIPLIER,
  MOBILITY_SYNERGY_SPEED_MULTIPLIER,
  FIRE_SYNERGY_BURN_MULTIPLIER,
  EXPLOSIVE_SYNERGY_DAMAGE_MULTIPLIER,
  EXPLOSIVE_SYNERGY_RADIUS_MULTIPLIER,
  ENERGY_SYNERGY_PIERCE_BONUS,
} from '../game/combat/synergies'

describe('getThemeStacks', () => {
  it('counts one stack per matching themed upgrade', () => {
    const stacks = getThemeStacks(
      [{ theme: ['crit'] }, { theme: ['crit', 'mobility'] }, { theme: ['fire'] }],
      'assault-rifle',
    )
    expect(stacks.crit).toBe(2)
    expect(stacks.mobility).toBe(1)
    expect(stacks.fire).toBe(1)
    expect(stacks.explosive).toBe(0)
    expect(stacks.energy).toBe(0)
  })

  it('ignores upgrades with no theme tag', () => {
    const stacks = getThemeStacks([{}, { theme: [] }], 'assault-rifle')
    expect(stacks).toEqual(EMPTY_THEME_STACKS)
  })

  it('adds one extra stack for wielding the weapon that embodies a theme', () => {
    expect(getThemeStacks([], 'flamethrower').fire).toBe(1)
    expect(getThemeStacks([], 'rocket-launcher').explosive).toBe(1)
    expect(getThemeStacks([], 'energy-weapon').energy).toBe(1)
  })

  it('never grants a weapon-based stack to crit or mobility, which have no weapon tie-in', () => {
    const stacks = getThemeStacks([], 'flamethrower')
    expect(stacks.crit).toBe(0)
    expect(stacks.mobility).toBe(0)
  })

  it('an unrecognized or default weapon id grants no bonus stack', () => {
    expect(getThemeStacks([], 'assault-rifle')).toEqual(EMPTY_THEME_STACKS)
  })
})

describe('isSynergyActive', () => {
  it('is inactive below the threshold and active at or above it', () => {
    const stacks = { ...EMPTY_THEME_STACKS, crit: SYNERGY_THRESHOLD - 1 }
    expect(isSynergyActive(stacks, 'crit')).toBe(false)
    stacks.crit = SYNERGY_THRESHOLD
    expect(isSynergyActive(stacks, 'crit')).toBe(true)
  })
})

describe('synergy multiplier/bonus getters', () => {
  const active = { crit: 3, fire: 3, explosive: 3, mobility: 3, energy: 3 }
  const inactive = EMPTY_THEME_STACKS

  it('return the no-op value when the theme is not active', () => {
    expect(getCritSynergyMultiplier(inactive)).toBe(1)
    expect(getMobilitySynergyMultiplier(inactive)).toBe(1)
    expect(getFireSynergyMultiplier(inactive)).toBe(1)
    expect(getExplosiveSynergyDamageMultiplier(inactive)).toBe(1)
    expect(getExplosiveSynergyRadiusMultiplier(inactive)).toBe(1)
    expect(getEnergySynergyPierceBonus(inactive)).toBe(0)
  })

  it('return the boosted value once the theme is active', () => {
    expect(getCritSynergyMultiplier(active)).toBe(CRIT_SYNERGY_DAMAGE_MULTIPLIER)
    expect(getMobilitySynergyMultiplier(active)).toBe(MOBILITY_SYNERGY_SPEED_MULTIPLIER)
    expect(getFireSynergyMultiplier(active)).toBe(FIRE_SYNERGY_BURN_MULTIPLIER)
    expect(getExplosiveSynergyDamageMultiplier(active)).toBe(EXPLOSIVE_SYNERGY_DAMAGE_MULTIPLIER)
    expect(getExplosiveSynergyRadiusMultiplier(active)).toBe(EXPLOSIVE_SYNERGY_RADIUS_MULTIPLIER)
    expect(getEnergySynergyPierceBonus(active)).toBe(ENERGY_SYNERGY_PIERCE_BONUS)
  })
})
