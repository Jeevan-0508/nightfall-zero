import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { brute, overlord, walker } from '../content/enemies'
import type { InputState } from '../game/engine/types'
import { assaultRifle, flamethrower, sniper } from '../content/weapons'

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

  it('gives a heavy-recoil weapon (sniper) a real screen kick on every shot, scaled off its own recoil stat', () => {
    const engine = new GameEngine(13)
    engine.player.position = { x: 100, y: 100 }
    engine.update(1 / 60, idleInput({ aimX: 200, aimY: 100, firing: true, switchTo: sniper.id }))
    expect(engine.screenShake).toBeGreaterThan(0)
  })

  it('lets a light-recoil weapon\'s tiny fire-kick decay away within the frame, unlike a real hit/explosion shake', () => {
    const engine = new GameEngine(13)
    engine.player.position = { x: 100, y: 100 }
    engine.update(1 / 60, idleInput({ aimX: 200, aimY: 100, firing: true, switchTo: flamethrower.id }))
    expect(engine.screenShake).toBe(0)
  })

  it('shakes the screen when a boss is defeated, not just when it hits the player', () => {
    const engine = new GameEngine(14)
    engine.player.position = { x: 100, y: 100 }
    const boss = createEnemy(overlord, { x: 300, y: 100 })
    boss.health = 1
    engine.enemyList.push(boss)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    let killed = false
    for (let i = 0; i < 240 && !killed; i++) {
      engine.update(1 / 60, input)
      if (!boss.alive) killed = true
    }

    expect(killed).toBe(true)
    expect(engine.screenShake).toBeGreaterThan(0)
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

  it('tracks a kill combo and resets it once the combo window expires', () => {
    const engine = new GameEngine(15)
    engine.player.position = { x: 100, y: 100 }
    const first = createEnemy(walker, { x: 300, y: 100 })
    first.health = 1
    const second = createEnemy(walker, { x: 300, y: 100 })
    second.health = 1
    engine.enemyList.push(first, second)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 60 && (first.alive || second.alive); i++) {
      engine.update(1 / 60, input)
      engine.drainEvents()
    }

    expect(first.alive).toBe(false)
    expect(second.alive).toBe(false)
    expect(engine.comboCount).toBe(2)

    for (let i = 0; i < 200; i++) engine.update(1 / 60, idleInput())
    expect(engine.comboCount).toBe(0)
  })
})
