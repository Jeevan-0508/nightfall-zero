import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy, killEnemy, DEATH_ANIMATION_DURATION, SPAWN_ANIMATION_DURATION } from '../game/entities/factories'
import { walker, exploder, overlord } from '../content/enemies'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

describe('enemy spawn/death animation state', () => {
  it('starts every freshly created enemy mid-spawn and not mid-death', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    expect(enemy.spawnTimer).toBe(SPAWN_ANIMATION_DURATION)
    expect(enemy.deathTimer).toBe(0)
  })

  it('killEnemy marks the enemy dead and starts its death-fade window', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    killEnemy(enemy)
    expect(enemy.alive).toBe(false)
    expect(enemy.deathTimer).toBe(DEATH_ANIMATION_DURATION)
  })

  it('gives an Exploder a shorter death-fade window than a regular enemy, since its explosion burst is the spectacle', () => {
    const enemy = createEnemy(exploder, { x: 0, y: 0 })
    killEnemy(enemy)
    expect(enemy.deathTimer).toBeGreaterThan(0)
    expect(enemy.deathTimer).toBeLessThan(DEATH_ANIMATION_DURATION)
  })

  it('decays spawnTimer to 0 for a regular enemy within its spawn animation window', () => {
    const engine = new GameEngine(200)
    engine.player.position = { x: 0, y: 0 }
    const enemy = createEnemy(walker, { x: 400, y: 400 })
    engine.enemyList.push(enemy)

    for (let i = 0; i < Math.ceil(SPAWN_ANIMATION_DURATION * 60) + 5; i++) engine.update(1 / 60, idleInput())

    expect(enemy.spawnTimer).toBe(0)
  })

  it('decays spawnTimer to 0 for a boss enemy too, even while its entrance callout holds it still', () => {
    const engine = new GameEngine(201)
    engine.player.position = { x: 0, y: 0 }
    const boss = createEnemy(overlord, { x: 500, y: 500 })
    engine.enemyList.push(boss)

    for (let i = 0; i < Math.ceil(SPAWN_ANIMATION_DURATION * 60) + 5; i++) engine.update(1 / 60, idleInput())

    expect(boss.spawnTimer).toBe(0)
  })

  it('keeps a killed enemy in the engine list with a decaying deathTimer instead of splicing it out immediately', () => {
    const engine = new GameEngine(202)
    engine.player.position = { x: 100, y: 100 }
    const target = createEnemy(walker, { x: 300, y: 100 })
    engine.enemyList.push(target)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 240 && target.alive; i++) engine.update(1 / 60, input)

    expect(target.alive).toBe(false)
    expect(engine.enemyList).toContain(target)
    expect(target.deathTimer).toBeGreaterThan(0)

    for (let i = 0; i < Math.ceil(DEATH_ANIMATION_DURATION * 60) + 5; i++) engine.update(1 / 60, idleInput())

    expect(target.alive).toBe(false)
    expect(target.deathTimer).toBe(0)
    expect(engine.enemyList).toContain(target)
  })
})
