import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy, createDefaultUpgrades } from '../game/entities/factories'
import { walker } from '../content/enemies'
import { pickUpgradeChoices, upgradePool } from '../content/upgrades'
import { applyUpgradesToWeapon } from '../game/combat/weapons'
import { assaultRifle } from '../content/weapons'
import { mulberry32 } from '../game/engine/rng'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

describe('GameEngine level-up flow', () => {
  it('pauses at levelup status once enough XP is earned, and resumes after an upgrade is chosen', () => {
    const engine = new GameEngine(40)
    engine.player.position = { x: 100, y: 100 }
    engine.player.xp = 95
    const target = createEnemy(walker, { x: 300, y: 100 })
    target.health = 1
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    let leveledUp = false
    for (let i = 0; i < 240 && !leveledUp; i++) {
      engine.update(1 / 60, input)
      if (engine.status === 'levelup') leveledUp = true
    }

    expect(leveledUp).toBe(true)
    expect(engine.player.level).toBe(2)
    expect(engine.pendingUpgradeChoices).toHaveLength(3)

    const survivalBefore = engine.stats.survivalTime
    engine.update(1 / 60, idleInput())
    expect(engine.stats.survivalTime).toBe(survivalBefore) // paused: no frame advances while choosing

    const chosenId = engine.pendingUpgradeChoices[0].id
    engine.chooseUpgrade(chosenId)
    expect(engine.status).toBe('playing')
    expect(engine.pendingUpgradeChoices).toHaveLength(0)
    expect(engine.chosenUpgrades).toHaveLength(1)
    expect(engine.chosenUpgrades[0].id).toBe(chosenId)
  })

  it('does not record a chosen upgrade for an unknown id', () => {
    const engine = new GameEngine(45)
    engine.player.position = { x: 100, y: 100 }
    engine.player.xp = 95
    const target = createEnemy(walker, { x: 300, y: 100 })
    target.health = 1
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 240 && engine.status !== 'levelup'; i++) engine.update(1 / 60, input)

    engine.chooseUpgrade('not-a-real-upgrade-id')
    expect(engine.chosenUpgrades).toHaveLength(0)
  })

  it('scales XP earned from kills by xpGainMultiplier', () => {
    const engine = new GameEngine(41)
    engine.player.position = { x: 100, y: 100 }
    engine.player.upgrades.xpGainMultiplier = 2
    const target = createEnemy(walker, { x: 300, y: 100 })
    target.health = 1
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 240 && target.alive; i++) engine.update(1 / 60, input)

    expect(engine.player.xp).toBeCloseTo(walker.xpValue * 2, 3)
  })

  it('moveSpeedMultiplier changes how far the player travels in a frame', () => {
    const baseline = new GameEngine(42)
    baseline.player.position = { x: 480, y: 300 }
    baseline.update(1 / 60, idleInput({ right: true }))

    const boosted = new GameEngine(42)
    boosted.player.position = { x: 480, y: 300 }
    boosted.player.upgrades.moveSpeedMultiplier = 2
    boosted.update(1 / 60, idleInput({ right: true }))

    expect(boosted.player.position.x - 480).toBeCloseTo((baseline.player.position.x - 480) * 2, 3)
  })
})

describe('upgrade content', () => {
  it('pickUpgradeChoices returns 3 distinct options from the pool', () => {
    const rng = mulberry32(7)
    const choices = pickUpgradeChoices(rng)
    expect(choices).toHaveLength(3)
    expect(new Set(choices.map((c) => c.id)).size).toBe(3)
  })

  it('every upgrade in the pool has a unique id and a working apply function', () => {
    const ids = new Set(upgradePool.map((o) => o.id))
    expect(ids.size).toBe(upgradePool.length)

    for (const option of upgradePool) {
      const engine = new GameEngine(1)
      expect(() => option.apply(engine.player)).not.toThrow()
    }
  })

  it('applying maxHealth heals the player by the same amount it raises the cap', () => {
    const engine = new GameEngine(44)
    engine.player.health = 50
    const before = engine.player.maxHealth
    const option = upgradePool.find((o) => o.id === 'maxHealth')!
    option.apply(engine.player)

    expect(engine.player.maxHealth).toBe(before + 20)
    expect(engine.player.health).toBe(70)
  })
})

describe('applyUpgradesToWeapon', () => {
  it('scales damage, fire rate, reload time, and crit chance by the given upgrades', () => {
    const upgrades = createDefaultUpgrades()
    upgrades.damageMultiplier = 1.5
    upgrades.fireRateMultiplier = 1.2
    upgrades.reloadSpeedMultiplier = 2
    upgrades.critChanceBonus = 0.1

    const effective = applyUpgradesToWeapon(assaultRifle, upgrades)

    expect(effective.damage).toBeCloseTo(assaultRifle.damage * 1.5)
    expect(effective.fireRate).toBeCloseTo(assaultRifle.fireRate * 1.2)
    expect(effective.reloadTime).toBeCloseTo(assaultRifle.reloadTime / 2)
    expect(effective.criticalChance).toBeCloseTo(assaultRifle.criticalChance + 0.1)
  })

  it('leaves stats unchanged with default (no-op) upgrades', () => {
    const effective = applyUpgradesToWeapon(assaultRifle, createDefaultUpgrades())
    expect(effective).toEqual(assaultRifle)
  })
})
