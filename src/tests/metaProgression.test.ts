import { describe, expect, it } from 'vitest'
import { applyMetaUpgrades, calculateScrapEarned, costForRank } from '../game/meta/metaProgression'
import { createPlayer } from '../game/entities/factories'
import { weaponOrder, assaultRifle } from '../content/weapons'
import { GameEngine } from '../game/engine/GameEngine'

function freshPlayer() {
  return createPlayer({ x: 0, y: 0 }, weaponOrder, assaultRifle.id)
}

describe('calculateScrapEarned', () => {
  it('combines kills, survival time, and wave reached', () => {
    const earned = calculateScrapEarned({ survivalTime: 30, kills: 10, waveReached: 2 }, {})
    expect(earned).toBe(10 * 2 + 30 + 2 * 10)
  })

  it('boosts payout by 10% per Scavenger\'s Network rank', () => {
    const base = calculateScrapEarned({ survivalTime: 30, kills: 10, waveReached: 2 }, {})
    const boosted = calculateScrapEarned({ survivalTime: 30, kills: 10, waveReached: 2 }, { scavenger: 2 })
    expect(boosted).toBe(Math.floor(base * 1.2))
  })

  it('floors fractional survival time before scoring', () => {
    const earned = calculateScrapEarned({ survivalTime: 5.9, kills: 0, waveReached: 0 }, {})
    expect(earned).toBe(5)
  })
})

describe('costForRank', () => {
  it('returns the base cost at rank 0', () => {
    expect(costForRank(50, 1.6, 0)).toBe(50)
  })

  it('grows geometrically with current rank', () => {
    expect(costForRank(50, 1.6, 1)).toBe(Math.round(50 * 1.6))
    expect(costForRank(50, 1.6, 2)).toBe(Math.round(50 * 1.6 * 1.6))
  })
})

describe('applyMetaUpgrades', () => {
  it('grants the full flat bonus for the owned rank', () => {
    const player = freshPlayer()
    const before = player.maxHealth
    applyMetaUpgrades(player, { vitality: 2 })
    expect(player.maxHealth).toBe(before + 20)
    expect(player.health).toBe(before + 20)
  })

  it('is a no-op for a rank of 0 or an absent id', () => {
    const player = freshPlayer()
    const before = { maxHealth: player.maxHealth, maxArmor: player.maxArmor }
    applyMetaUpgrades(player, { vitality: 0 })
    expect(player.maxHealth).toBe(before.maxHealth)
    expect(player.maxArmor).toBe(before.maxArmor)
  })

  it('ignores unknown upgrade ids', () => {
    const player = freshPlayer()
    const before = player.maxHealth
    expect(() => applyMetaUpgrades(player, { notARealUpgrade: 3 })).not.toThrow()
    expect(player.maxHealth).toBe(before)
  })

  it('applies percentage upgrades through the player upgrades multipliers', () => {
    const player = freshPlayer()
    applyMetaUpgrades(player, { combatDrills: 2, conditioning: 1 })
    expect(player.upgrades.damageMultiplier).toBeCloseTo(1.1, 5)
    expect(player.upgrades.moveSpeedMultiplier).toBeCloseTo(1.05, 5)
  })
})

describe('GameEngine meta-upgrade wiring', () => {
  it('applies persisted ranks to the player created for a new run', () => {
    const engine = new GameEngine(1, assaultRifle.id, { vitality: 1, plating: 1 })
    expect(engine.player.maxHealth).toBe(110)
    expect(engine.player.maxArmor).toBe(110)
  })

  it('defaults to no meta-upgrades when none are supplied', () => {
    const engine = new GameEngine(1)
    expect(engine.player.maxHealth).toBe(100)
    expect(engine.player.maxArmor).toBe(100)
  })
})
