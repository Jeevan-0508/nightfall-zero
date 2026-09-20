import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { brute, walker } from '../content/enemies'
import type { InputState } from '../game/engine/types'
import { assaultRifle } from '../content/weapons'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

describe('GameEngine event stream', () => {
  it('emits shotFired and kicks recoil when a shot is fired', () => {
    const engine = new GameEngine(10)
    engine.player.position = { x: 100, y: 100 }
    engine.update(1 / 60, idleInput({ aimX: 200, aimY: 100, firing: true }))

    const events = engine.drainEvents()
    expect(events.some((e) => e.type === 'shotFired')).toBe(true)
    expect(engine.recoilAmount).toBeGreaterThan(0)
  })

  it('recoil decays back to zero over subsequent frames', () => {
    const engine = new GameEngine(11)
    engine.player.position = { x: 100, y: 100 }
    engine.update(1 / 60, idleInput({ aimX: 200, aimY: 100, firing: true }))
    expect(engine.recoilAmount).toBeGreaterThan(0)

    for (let i = 0; i < 60; i++) engine.update(1 / 60, idleInput({ aimX: 200, aimY: 100 }))
    expect(engine.recoilAmount).toBe(0)
  })

  it('emits hit/critHit and enemyDeath from a killing shot, and drains exactly once', () => {
    const engine = new GameEngine(12)
    engine.player.position = { x: 100, y: 100 }
    const target = createEnemy(walker, { x: 300, y: 100 })
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    let sawHit = false
    let sawDeath = false
    for (let i = 0; i < 240 && target.alive; i++) {
      engine.update(1 / 60, input)
      for (const event of engine.drainEvents()) {
        if (event.type === 'hit' || event.type === 'critHit') sawHit = true
        if (event.type === 'enemyDeath') sawDeath = true
      }
    }

    expect(sawHit).toBe(true)
    expect(sawDeath).toBe(true)
    expect(engine.drainEvents()).toHaveLength(0)
  })

  it('emits playerHit when an enemy makes contact', () => {
    const engine = new GameEngine(13)
    engine.player.position = { x: 200, y: 200 }
    engine.enemyList.push(createEnemy(brute, { x: 205, y: 200 }))
    engine.update(1 / 60, idleInput())

    expect(engine.drainEvents().some((e) => e.type === 'playerHit')).toBe(true)
  })

  it('emits reloadStart when the magazine empties and reloadComplete once reload finishes', () => {
    const engine = new GameEngine(14)
    engine.player.position = { x: 100, y: 100 }
    const input = idleInput({ aimX: 200, aimY: 100, firing: true })

    let sawReloadStart = false
    for (let i = 0; i < assaultRifle.magazineSize + 2; i++) {
      engine.update(1 / 60, input)
      if (engine.drainEvents().some((e) => e.type === 'reloadStart')) sawReloadStart = true
      engine.update(1 / 60 + 1 / assaultRifle.fireRate, idleInput())
      engine.drainEvents()
    }
    expect(sawReloadStart).toBe(true)

    let sawReloadComplete = false
    for (let i = 0; i < 240 && !sawReloadComplete; i++) {
      engine.update(1 / 60, idleInput())
      if (engine.drainEvents().some((e) => e.type === 'reloadComplete')) sawReloadComplete = true
    }
    expect(sawReloadComplete).toBe(true)
  })
})
