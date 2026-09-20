import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { exploder, spitter, stalker } from '../content/enemies'
import { getWaveDefinition } from '../content/waves'
import { distance } from '../game/engine/vector'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

describe('Spitter (ranged behavior)', () => {
  it('keeps its distance and fires a projectile that damages the player', () => {
    const engine = new GameEngine(20)
    engine.player.position = { x: 480, y: 300 }
    const shooter = createEnemy(spitter, { x: 680, y: 300 })
    engine.enemyList.push(shooter)

    const healthBefore = engine.player.health + engine.player.armor
    let firedProjectile = false
    for (let i = 0; i < 200; i++) {
      engine.update(1 / 60, idleInput())
      if (engine.enemyProjectiles.length > 0) firedProjectile = true
    }

    expect(firedProjectile).toBe(true)
    expect(engine.player.health + engine.player.armor).toBeLessThan(healthBefore)
    expect(distance(shooter.position, engine.player.position)).toBeGreaterThan(spitter.radius + engine.player.radius + 5)
  })
})

describe('Exploder (explosive contact/death)', () => {
  it('detonates on touching the player, dealing damage once and removing itself', () => {
    const engine = new GameEngine(21)
    engine.player.position = { x: 300, y: 300 }
    const bomber = createEnemy(exploder, { x: 305, y: 300 })
    engine.enemyList.push(bomber)

    const healthBefore = engine.player.health + engine.player.armor
    engine.update(1 / 60, idleInput())

    expect(bomber.alive).toBe(false)
    expect(engine.player.health + engine.player.armor).toBeLessThan(healthBefore)
    expect(engine.stats.kills).toBe(1)
  })

  it('also detonates when killed by gunfire, splashing a nearby player', () => {
    const engine = new GameEngine(22)
    engine.player.position = { x: 100, y: 100 }
    const bomber = createEnemy(exploder, { x: 160, y: 100 })
    engine.enemyList.push(bomber)

    const healthBefore = engine.player.health + engine.player.armor
    const input = idleInput({ aimX: 160, aimY: 100, firing: true })
    for (let i = 0; i < 90 && bomber.alive; i++) engine.update(1 / 60, input)

    expect(bomber.alive).toBe(false)
    expect(engine.player.health + engine.player.armor).toBeLessThan(healthBefore)
  })
})

describe('Stalker (cloak + dash behavior)', () => {
  it('takes no damage from gunfire while cloaked, but can be hit once decloaked', () => {
    const engine = new GameEngine(23)
    engine.player.position = { x: 100, y: 100 }
    const ghost = createEnemy(stalker, { x: 300, y: 100 })
    ghost.cloaked = true
    ghost.phaseTimer = 10
    engine.enemyList.push(ghost)

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 30; i++) engine.update(1 / 60, input)
    expect(ghost.health).toBe(stalker.health)

    ghost.cloaked = false
    for (let i = 0; i < 90 && ghost.health === stalker.health; i++) engine.update(1 / 60, input)
    expect(ghost.health).toBeLessThan(stalker.health)
  })
})

describe('wave content', () => {
  it('introduces the new enemy roster by wave 6 and keeps them in the endless escalation', () => {
    const wave6Ids = getWaveDefinition(6).spawns.map((s) => s.defId)
    expect(wave6Ids).toContain('spitter')
    expect(wave6Ids).toContain('exploder')
    expect(wave6Ids).toContain('stalker')

    const enduranceIds = getWaveDefinition(12).spawns.map((s) => s.defId)
    expect(enduranceIds).toContain('spitter')
    expect(enduranceIds).toContain('exploder')
    expect(enduranceIds).toContain('stalker')
  })
})
