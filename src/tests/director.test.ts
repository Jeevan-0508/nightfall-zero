import { describe, expect, it } from 'vitest'
import {
  applyDirectorBias,
  createDirectorState,
  getSpawnModifier,
  updateDirector,
} from '../game/director/director'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { brute } from '../content/enemies'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

describe('Adaptive Director signals', () => {
  it('raises intensity on damage taken and kills, and decays it back down when quiet', () => {
    const state = createDirectorState()
    updateDirector(state, 1 / 60, { damageTaken: 20, killsThisFrame: 1, healthRatio: 1 })
    expect(state.intensity).toBeGreaterThan(0)

    const afterHit = state.intensity
    for (let i = 0; i < 600; i++) {
      updateDirector(state, 1 / 60, { damageTaken: 0, killsThisFrame: 0, healthRatio: 1 })
    }
    expect(state.intensity).toBeLessThan(afterHit)
  })

  it('builds intensity over time while the player is at low health', () => {
    const state = createDirectorState()
    for (let i = 0; i < 120; i++) {
      updateDirector(state, 1 / 60, { damageTaken: 0, killsThisFrame: 0, healthRatio: 0.1 })
    }
    expect(state.intensity).toBeGreaterThan(0.2)
  })

  it('forces a relief window once intensity peaks, easing pacing back off', () => {
    const state = createDirectorState()
    for (let i = 0; i < 2000 && state.calmTimer === 0; i++) {
      updateDirector(state, 1 / 60, { damageTaken: 5, killsThisFrame: 0, healthRatio: 1 })
    }
    expect(state.calmTimer).toBeGreaterThan(0)

    const modifier = getSpawnModifier(state)
    expect(modifier.intervalMultiplier).toBeGreaterThan(1)
    expect(modifier.toughEnemyBias).toBeLessThan(0)
  })

  it('speeds up and biases toward tougher spawns when nothing has happened for a while', () => {
    const state = createDirectorState()
    for (let i = 0; i < 600; i++) {
      updateDirector(state, 1 / 60, { damageTaken: 0, killsThisFrame: 0, healthRatio: 1 })
    }
    expect(state.intensity).toBeLessThan(0.25)

    const modifier = getSpawnModifier(state)
    expect(modifier.intervalMultiplier).toBeLessThan(1)
    expect(modifier.toughEnemyBias).toBeGreaterThan(0)
  })
})

describe('applyDirectorBias', () => {
  it('pulls the toughest remaining entry to the front when bias is positive', () => {
    const queue = ['walker', 'runner', 'brute', 'walker']
    applyDirectorBias(queue, 0.5)
    expect(queue[0]).toBe('brute')
  })

  it('pulls the easiest remaining entry to the front when bias is negative', () => {
    const queue = ['brute', 'stalker', 'walker', 'exploder']
    applyDirectorBias(queue, -0.5)
    expect(queue[0]).toBe('walker')
  })

  it('is a no-op once the desired entry already leads (idempotent)', () => {
    const queue = ['brute', 'walker', 'runner']
    applyDirectorBias(queue, 0.5)
    const snapshot = [...queue]
    applyDirectorBias(queue, 0.5)
    expect(queue).toEqual(snapshot)
  })

  it('ignores a near-neutral bias and leaves authored order alone', () => {
    const queue = ['walker', 'brute', 'runner']
    applyDirectorBias(queue, 0.02)
    expect(queue).toEqual(['walker', 'brute', 'runner'])
  })
})

describe('GameEngine adaptive pacing integration', () => {
  it('exposes a director that heats up as the player takes repeated hits', () => {
    const engine = new GameEngine(30)
    engine.player.position = { x: 200, y: 200 }
    engine.enemyList.push(createEnemy(brute, { x: 205, y: 200 }))

    expect(engine.director.intensity).toBe(0)
    for (let i = 0; i < 120; i++) engine.update(1 / 60, idleInput())
    expect(engine.director.intensity).toBeGreaterThan(0)
  })
})
