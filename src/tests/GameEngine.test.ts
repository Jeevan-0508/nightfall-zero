import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { SHIELD_CAPACITY } from '../game/combat/eliteModifiers'
import { walker, brute, spitter } from '../content/enemies'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

describe('GameEngine combat loop', () => {
  it('kills an enemy hit by enough projectiles and awards XP + a kill', () => {
    const engine = new GameEngine(1)
    engine.player.position = { x: 100, y: 100 }
    const target = createEnemy(walker, { x: 300, y: 100 })
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 240 && target.alive; i++) {
      engine.update(1 / 60, input)
    }

    expect(target.alive).toBe(false)
    expect(engine.stats.kills).toBeGreaterThanOrEqual(1)
    expect(engine.player.xp + (engine.player.level - 1) * 1).toBeGreaterThan(0)
  })

  it('applies contact damage to the player when an enemy touches them', () => {
    const engine = new GameEngine(2)
    engine.player.position = { x: 200, y: 200 }
    const attacker = createEnemy(brute, { x: 205, y: 200 })
    engine.enemyList.push(attacker)

    const before = engine.player.health + engine.player.armor
    engine.update(1 / 60, idleInput())
    const after = engine.player.health + engine.player.armor

    expect(after).toBeLessThan(before)
  })

  it('kills the player and flips status to dead after enough sustained damage', () => {
    const engine = new GameEngine(3)
    engine.player.position = { x: 400, y: 300 }
    const attacker = createEnemy(brute, { x: 405, y: 300 })
    engine.enemyList.push(attacker)

    for (let i = 0; i < 600 && engine.status === 'playing'; i++) {
      engine.update(1 / 60, idleInput())
    }

    expect(engine.status).toBe('dead')
    expect(engine.player.alive).toBe(false)
    expect(engine.player.health).toBe(0)
  })

  it('exposes a HUD snapshot with primitive fields only', () => {
    const engine = new GameEngine(4)
    const snapshot = engine.getHudSnapshot()
    expect(snapshot.weaponName).toBe('Assault Rifle')
    expect(snapshot.magazineSize).toBe(30)
    expect(snapshot.status).toBe('playing')
  })
})

describe('status effects integration', () => {
  it('flamethrower fire applies a burn status that keeps damaging after contact stops', () => {
    const engine = new GameEngine(5, 'flamethrower')
    engine.player.position = { x: 100, y: 100 }
    const target = createEnemy(walker, { x: 140, y: 100 })
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 140, aimY: 100, firing: true })
    for (let i = 0; i < 10 && target.alive; i++) {
      engine.update(1 / 60, input)
    }

    expect(target.alive).toBe(true)
    expect(target.statuses.some((s) => s.type === 'burn')).toBe(true)

    const healthAfterContact = target.health
    for (let i = 0; i < 30 && target.alive; i++) {
      engine.update(1 / 60, idleInput())
    }

    expect(target.health).toBeLessThan(healthAfterContact)
  })

  it('a critical hit applies a brief slow status', () => {
    const engine = new GameEngine(6, 'pistol')
    engine.player.upgrades.critChanceBonus = 1
    engine.player.position = { x: 100, y: 100 }
    const target = createEnemy(brute, { x: 300, y: 100 })
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 120 && target.alive && !target.statuses.some((s) => s.type === 'slow'); i++) {
      engine.update(1 / 60, input)
    }

    expect(target.statuses.some((s) => s.type === 'slow')).toBe(true)
  })

  it('explosion survivors near (but not directly hit by) a rocket are marked as more vulnerable', () => {
    const engine = new GameEngine(7, 'rocket-launcher')
    engine.player.position = { x: 100, y: 100 }
    const directHit = createEnemy(brute, { x: 260, y: 100 })
    engine.enemyList.push(directHit)
    const splashTarget = createEnemy(brute, { x: 300, y: 100 })
    engine.enemyList.push(splashTarget)
    const farTarget = createEnemy(spitter, { x: 700, y: 700 })
    engine.enemyList.push(farTarget)

    const input = idleInput({ aimX: 260, aimY: 100, firing: true })
    for (let i = 0; i < 60 && splashTarget.alive && !splashTarget.statuses.some((s) => s.type === 'mark'); i++) {
      engine.update(1 / 60, input)
    }

    expect(splashTarget.statuses.some((s) => s.type === 'mark')).toBe(true)
    expect(farTarget.statuses).toHaveLength(0)
  })
})

describe('elite modifiers integration', () => {
  it('an Armored elite takes reduced damage from a non-crit hit but full damage from a crit', () => {
    const engineNonCrit = new GameEngine(8, 'pistol')
    engineNonCrit.player.upgrades.critChanceBonus = -1 // force every hit to roll as non-crit
    engineNonCrit.player.position = { x: 100, y: 100 }
    const armoredTarget = createEnemy(brute, { x: 200, y: 100 }, true, 'armored')
    const startHealth = armoredTarget.health
    engineNonCrit.enemyList.push(armoredTarget)
    const nonCritInput = idleInput({ aimX: 200, aimY: 100, firing: true })
    for (let i = 0; i < 30 && armoredTarget.health === startHealth; i++) {
      engineNonCrit.update(1 / 60, nonCritInput)
    }
    const nonCritDamage = startHealth - armoredTarget.health

    const engineCrit = new GameEngine(8, 'pistol')
    engineCrit.player.upgrades.critChanceBonus = 1 // force every hit to crit
    engineCrit.player.position = { x: 100, y: 100 }
    const armoredTarget2 = createEnemy(brute, { x: 200, y: 100 }, true, 'armored')
    engineCrit.enemyList.push(armoredTarget2)
    const critInput = idleInput({ aimX: 200, aimY: 100, firing: true })
    for (let i = 0; i < 30 && armoredTarget2.health === startHealth; i++) {
      engineCrit.update(1 / 60, critInput)
    }
    const critDamage = startHealth - armoredTarget2.health

    expect(nonCritDamage).toBeGreaterThan(0)
    expect(critDamage).toBeGreaterThan(nonCritDamage)
  })

  it('a Shielded elite absorbs damage into its shield before health drops', () => {
    const engine = new GameEngine(9, 'pistol')
    engine.player.position = { x: 100, y: 100 }
    const target = createEnemy(brute, { x: 200, y: 100 }, true, 'shielded')
    engine.enemyList.push(target)
    expect(target.shieldRemaining).toBe(SHIELD_CAPACITY)

    const input = idleInput({ aimX: 200, aimY: 100, firing: true })
    for (let i = 0; i < 30 && target.shieldRemaining === SHIELD_CAPACITY; i++) {
      engine.update(1 / 60, input)
    }

    expect(target.health).toBe(target.maxHealth)
    expect(target.shieldRemaining).toBeLessThan(SHIELD_CAPACITY)
  })
})
