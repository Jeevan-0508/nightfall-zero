import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import type { InputState } from '../game/engine/types'
import { dash, grenade, overcharge } from '../content/abilities'
import { assaultRifle } from '../content/weapons'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    aimX: 0,
    aimY: 0,
    firing: false,
    switchTo: null,
    abilityTrigger: null,
    ...overrides,
  }
}

describe('dash', () => {
  it('moves the player instantly in the aimed direction', () => {
    const engine = new GameEngine(30)
    engine.player.position = { x: 200, y: 200 }
    const before = { ...engine.player.position }

    engine.update(1 / 60, idleInput({ aimX: 400, aimY: 200, abilityTrigger: 'dash' }))

    expect(engine.player.position.x).toBeGreaterThan(before.x + 100)
    expect(Math.abs(engine.player.position.y - before.y)).toBeLessThan(5)
  })

  it('grants a brief invulnerability window that skips contact damage', () => {
    const engine = new GameEngine(31)
    engine.player.position = { x: 200, y: 200 }
    const enemy = createEnemy(walker, { x: 205, y: 200 })
    engine.enemyList.push(enemy)
    const healthBefore = engine.player.health

    engine.update(1 / 60, idleInput({ aimX: 400, aimY: 200, abilityTrigger: 'dash' }))

    expect(engine.player.health).toBe(healthBefore)
    expect(engine.player.dashInvulnerableTimer).toBeGreaterThan(0)
  })

  it('cannot be reactivated before its cooldown expires', () => {
    const engine = new GameEngine(32)
    engine.player.position = { x: 200, y: 200 }
    engine.update(1 / 60, idleInput({ aimX: 400, aimY: 200, abilityTrigger: 'dash' }))
    const afterFirstDash = { ...engine.player.position }

    engine.update(1 / 60, idleInput({ aimX: 400, aimY: 200, abilityTrigger: 'dash' }))

    expect(engine.player.position.x).toBeCloseTo(afterFirstDash.x, 5)
    expect(engine.player.abilities[dash.id].cooldownRemaining).toBeGreaterThan(0)
  })
})

describe('grenade', () => {
  it('travels forward under drag after being thrown', () => {
    const engine = new GameEngine(33)
    engine.player.position = { x: 100, y: 100 }

    engine.update(1 / 60, idleInput({ aimX: 400, aimY: 100, abilityTrigger: 'grenade' }))
    expect(engine.grenades.length).toBe(1)
    const spawnedPosition = { ...engine.grenades[0].position }

    engine.update(1 / 60, idleInput({ aimX: 400, aimY: 100 }))
    expect(engine.grenades[0].position.x).toBeGreaterThan(spawnedPosition.x)
  })

  it('explodes on fuse expiry and damages a nearby enemy', () => {
    const engine = new GameEngine(33)
    engine.player.position = { x: 100, y: 100 }
    const target = createEnemy(walker, { x: 140, y: 100 })
    engine.enemyList.push(target)
    const startHealth = target.health

    engine.update(1 / 60, idleInput({ aimX: 400, aimY: 100, abilityTrigger: 'grenade' }))
    expect(engine.grenades.length).toBe(1)
    // Fuse expiry, not the physics roll, is what this test is checking, so cut the
    // fuse short instead of waiting out the full drag-decay travel distance.
    engine.grenades[0].fuseRemaining = 0.005

    engine.update(1 / 60, idleInput())

    expect(engine.grenades.length).toBe(0)
    expect(target.health).toBeLessThan(startHealth)
  })

  it('cannot be reactivated before its cooldown expires', () => {
    const engine = new GameEngine(34)
    engine.update(1 / 60, idleInput({ abilityTrigger: 'grenade' }))
    expect(engine.grenades.length).toBe(1)

    engine.update(1 / 60, idleInput({ abilityTrigger: 'grenade' }))
    expect(engine.grenades.length).toBe(1)
    expect(engine.player.abilities[grenade.id].cooldownRemaining).toBeGreaterThan(0)
  })
})

describe('overcharge', () => {
  it('boosts fire rate and move speed while active, then reverts after it expires', () => {
    const engine = new GameEngine(35)
    const baseFireRate = engine.weaponDef.fireRate

    engine.update(1 / 60, idleInput({ abilityTrigger: 'overcharge' }))
    expect(engine.weaponDef.fireRate).toBeGreaterThan(baseFireRate)

    engine.player.position = { x: 200, y: 200 }
    engine.update(1 / 60, idleInput({ right: true }))
    const boostedTravel = engine.player.position.x - 200

    for (let i = 0; i < 300 && engine.player.abilities[overcharge.id].activeRemaining > 0; i++) {
      engine.update(1 / 60, idleInput())
    }

    expect(engine.weaponDef.fireRate).toBeCloseTo(baseFireRate, 5)

    engine.player.position = { x: 200, y: 200 }
    engine.update(1 / 60, idleInput({ right: true }))
    const normalTravel = engine.player.position.x - 200

    expect(boostedTravel).toBeGreaterThan(normalTravel)
  })

  it('cannot be reactivated before its cooldown expires', () => {
    const engine = new GameEngine(36)
    engine.update(1 / 60, idleInput({ abilityTrigger: 'overcharge' }))
    expect(engine.player.abilities[overcharge.id].activeRemaining).toBeCloseTo(overcharge.duration ?? 0, 2)

    engine.update(1 / 60, idleInput({ abilityTrigger: 'overcharge' }))

    expect(engine.player.abilities[overcharge.id].activeRemaining).toBeLessThan(overcharge.duration ?? 0)
  })
})

describe('ability HUD snapshot', () => {
  it('reflects each ability id, key, and cooldown state', () => {
    const engine = new GameEngine(37)
    const initial = engine.getHudSnapshot().abilities
    expect(initial.map((a) => a.id)).toEqual([dash.id, grenade.id, overcharge.id])
    expect(initial.every((a) => a.cooldownRemaining === 0)).toBe(true)

    engine.update(1 / 60, idleInput({ abilityTrigger: 'dash' }))
    const afterDash = engine.getHudSnapshot().abilities.find((a) => a.id === dash.id)
    expect(afterDash?.cooldownRemaining).toBeGreaterThan(0)
    expect(afterDash?.cooldown).toBe(dash.cooldown)
  })

  it('marks overcharge as active while its buff window is running', () => {
    const engine = new GameEngine(38)
    engine.update(1 / 60, idleInput({ abilityTrigger: 'overcharge' }))
    const snapshot = engine.getHudSnapshot().abilities.find((a) => a.id === overcharge.id)
    expect(snapshot?.active).toBe(true)
  })
})

describe('assault rifle base fire rate sanity', () => {
  it('is a positive number so overcharge multiplier tests are meaningful', () => {
    expect(assaultRifle.fireRate).toBeGreaterThan(0)
  })
})
