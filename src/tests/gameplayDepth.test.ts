import { describe, expect, it } from 'vitest'
import {
  createEnemy,
  eliteChanceForWave,
  rollElite,
  ELITE_HEALTH_MULTIPLIER,
} from '../game/entities/factories'
import { walker } from '../content/enemies'
import { pickUpgradeChoices, upgradePool } from '../content/upgrades'
import { applyUpgradesToWeapon } from '../game/combat/weapons'
import { assaultRifle } from '../content/weapons'
import { mulberry32 } from '../game/engine/rng'
import { createDefaultUpgrades } from '../game/entities/factories'

describe('eliteChanceForWave', () => {
  it('is zero for the first two waves', () => {
    expect(eliteChanceForWave(1)).toBe(0)
    expect(eliteChanceForWave(2)).toBe(0)
  })

  it('increases with wave number and caps at 0.22', () => {
    expect(eliteChanceForWave(3)).toBeCloseTo(0.04, 5)
    expect(eliteChanceForWave(7)).toBeCloseTo(0.2, 5)
    expect(eliteChanceForWave(20)).toBe(0.22)
    expect(eliteChanceForWave(1000)).toBe(0.22)
  })
})

describe('rollElite', () => {
  it('never rolls elite on early waves regardless of rng', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 50; i++) {
      expect(rollElite(rng, 1)).toBe(false)
    }
  })

  it('is deterministic for a given seed and wave', () => {
    const resultsA = [] as boolean[]
    const rngA = mulberry32(99)
    for (let i = 0; i < 20; i++) resultsA.push(rollElite(rngA, 10))

    const resultsB = [] as boolean[]
    const rngB = mulberry32(99)
    for (let i = 0; i < 20; i++) resultsB.push(rollElite(rngB, 10))

    expect(resultsA).toEqual(resultsB)
    expect(resultsA.some(Boolean)).toBe(true)
  })
})

describe('createEnemy elite scaling', () => {
  it('scales health by ELITE_HEALTH_MULTIPLIER and sets the elite flag', () => {
    const normal = createEnemy(walker, { x: 0, y: 0 })
    const elite = createEnemy(walker, { x: 0, y: 0 }, true)

    expect(normal.elite).toBe(false)
    expect(elite.elite).toBe(true)
    expect(elite.health).toBeCloseTo(normal.health * ELITE_HEALTH_MULTIPLIER, 5)
    expect(elite.maxHealth).toBeCloseTo(normal.maxHealth * ELITE_HEALTH_MULTIPLIER, 5)
  })
})

describe('pickUpgradeChoices rarity gating', () => {
  it('never offers rare/epic/legendary upgrades before their required level, across many seeds', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = mulberry32(seed + 1)
      const choices = pickUpgradeChoices(rng, 1)
      for (const choice of choices) {
        expect(choice.rarity).toBe('common')
      }
    }
  })

  it('can surface rare upgrades once level 2 is reached', () => {
    let sawRare = false
    for (let seed = 0; seed < 500 && !sawRare; seed++) {
      const rng = mulberry32(seed + 1)
      const choices = pickUpgradeChoices(rng, 2)
      if (choices.some((c) => c.rarity === 'rare')) sawRare = true
    }
    expect(sawRare).toBe(true)
  })

  it('can surface legendary upgrades once level 6 is reached', () => {
    let sawLegendary = false
    for (let seed = 0; seed < 500 && !sawLegendary; seed++) {
      const rng = mulberry32(seed + 1)
      const choices = pickUpgradeChoices(rng, 6)
      if (choices.some((c) => c.rarity === 'legendary')) sawLegendary = true
    }
    expect(sawLegendary).toBe(true)
  })

  it('returns distinct upgrades with no duplicates at any level', () => {
    const rng = mulberry32(7)
    const choices = pickUpgradeChoices(rng, 6, 3)
    const ids = choices.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every upgrade in the pool has a valid rarity', () => {
    const validRarities = new Set(['common', 'rare', 'epic', 'legendary'])
    for (const upgrade of upgradePool) {
      expect(validRarities.has(upgrade.rarity)).toBe(true)
    }
  })
})

describe('critDamageMultiplier', () => {
  it('scales criticalMultiplier on the derived weapon stats', () => {
    const base = applyUpgradesToWeapon(assaultRifle, createDefaultUpgrades())
    const upgrades = createDefaultUpgrades()
    upgrades.critDamageMultiplier = 1.75
    const boosted = applyUpgradesToWeapon(assaultRifle, upgrades)

    expect(boosted.criticalMultiplier).toBeCloseTo(base.criticalMultiplier * 1.75, 5)
  })
})
