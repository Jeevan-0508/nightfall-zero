import { describe, expect, it } from 'vitest'
import {
  createTelemetryState,
  updateTelemetry,
  type TelemetryState,
} from '../game/director/telemetry'
import { applyDirectorBias, applyProfileCounter, PROFILE_COUNTER_RANK } from '../game/director/director'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

function feed(state: TelemetryState, frames: number, sample: Parameters<typeof updateTelemetry>[2], dt = 1 / 60): void {
  for (let i = 0; i < frames; i++) updateTelemetry(state, dt, sample)
}

describe('telemetry classification', () => {
  it('stays balanced until enough samples have accumulated', () => {
    const state = createTelemetryState()
    updateTelemetry(state, 1 / 60, { movementDistance: 0, nearestEnemyDistance: 300, playerPosition: { x: 480, y: 300 } })
    expect(state.profile).toBe('balanced')
  })

  it('classifies a stationary player near enemies as a camper', () => {
    const state = createTelemetryState()
    feed(state, 600, { movementDistance: 0, nearestEnemyDistance: 150, playerPosition: { x: 480, y: 300 } })
    expect(state.profile).toBe('camper')
  })

  it('classifies a player who moves fast while keeping distance as a kiter', () => {
    const state = createTelemetryState()
    feed(state, 600, { movementDistance: 3, nearestEnemyDistance: 300, playerPosition: { x: 480, y: 300 } })
    expect(state.profile).toBe('kiter')
  })

  it('classifies a player who stays in melee range as a brawler', () => {
    const state = createTelemetryState()
    feed(state, 600, { movementDistance: 0.6, nearestEnemyDistance: 40, playerPosition: { x: 480, y: 300 } })
    expect(state.profile).toBe('brawler')
  })

  it('classifies a player who parks near the arena wall as an edge hugger', () => {
    const state = createTelemetryState()
    feed(state, 600, { movementDistance: 0.6, nearestEnemyDistance: 300, playerPosition: { x: 20, y: 300 } })
    expect(state.profile).toBe('edgeHugger')
  })

  it('defaults distance to a large value when no enemies are alive, never reads as a brawler', () => {
    const state = createTelemetryState()
    feed(state, 600, { movementDistance: 0, nearestEnemyDistance: null, playerPosition: { x: 480, y: 300 } })
    expect(state.profile).not.toBe('brawler')
  })
})

describe('applyDirectorBias with a custom rank map', () => {
  it('reorders using the supplied map instead of the default difficulty map', () => {
    const queue = ['walker', 'brute', 'spitter']
    applyDirectorBias(queue, 1, { walker: 1, brute: 1, spitter: 9 })
    expect(queue[0]).toBe('spitter')
  })
})

describe('applyProfileCounter', () => {
  it('is a no-op for the balanced profile', () => {
    const queue = ['walker', 'brute', 'spitter']
    applyProfileCounter(queue, 'balanced')
    expect(queue).toEqual(['walker', 'brute', 'spitter'])
  })

  it('pulls the runner forward against a kiter', () => {
    const queue = ['walker', 'brute', 'runner', 'spitter']
    applyProfileCounter(queue, 'kiter')
    expect(queue[0]).toBe('runner')
  })

  it('pulls the exploder forward against a camper', () => {
    const queue = ['walker', 'brute', 'exploder']
    applyProfileCounter(queue, 'camper')
    expect(queue[0]).toBe('exploder')
  })

  it('pulls the stalker forward against an edge hugger', () => {
    const queue = ['walker', 'brute', 'stalker']
    applyProfileCounter(queue, 'edgeHugger')
    expect(queue[0]).toBe('stalker')
  })

  it('pulls the spitter forward against a brawler', () => {
    const queue = ['walker', 'brute', 'spitter']
    applyProfileCounter(queue, 'brawler')
    expect(queue[0]).toBe('spitter')
  })

  it('every non-balanced profile has a defined counter map', () => {
    const profiles = Object.keys(PROFILE_COUNTER_RANK) as (keyof typeof PROFILE_COUNTER_RANK)[]
    for (const profile of profiles) {
      if (profile === 'balanced') continue
      expect(Object.keys(PROFILE_COUNTER_RANK[profile]).length).toBeGreaterThan(0)
    }
  })
})

describe('GameEngine telemetry integration', () => {
  it('tracks nearest-enemy distance and exposes it through the HUD snapshot', () => {
    const engine = new GameEngine(50)
    engine.player.position = { x: 100, y: 100 }
    engine.enemyList.push(createEnemy(walker, { x: 140, y: 100 }))

    for (let i = 0; i < 30; i++) engine.update(1 / 60, idleInput())

    expect(engine.telemetry.avgNearestEnemyDistance).toBeLessThan(300)
    const snapshot = engine.getHudSnapshot()
    expect(snapshot.debug.avgNearestEnemyDistance).toBe(engine.telemetry.avgNearestEnemyDistance)
    expect(snapshot.debug.profile).toBe(engine.telemetry.profile)
  })

  it('exposes accuracy derived from shots fired vs shots hit', () => {
    const engine = new GameEngine(51)
    expect(engine.getHudSnapshot().debug.accuracy).toBe(0)
    engine.stats.shotsFired = 4
    engine.stats.shotsHit = 3
    expect(engine.getHudSnapshot().debug.accuracy).toBeCloseTo(0.75, 5)
  })
})

describe('GameEngine director counter announcements', () => {
  it('fires a director toast and event exactly once when the player profile leaves balanced', () => {
    const engine = new GameEngine(52)
    engine.player.position = { x: 480, y: 300 }
    engine.enemyList.push(createEnemy(walker, { x: 630, y: 300 }))

    let directorEvents = 0
    for (let i = 0; i < 700; i++) {
      engine.update(1 / 60, idleInput())
      directorEvents += engine.drainEvents().filter((e) => e.type === 'directorAnalysis').length
    }

    expect(engine.telemetry.profile).toBe('camper')
    expect(directorEvents).toBe(1)
  })

  it('does not re-announce the same profile while the announce cooldown is active', () => {
    const engine = new GameEngine(53)
    engine.player.position = { x: 480, y: 300 }
    engine.enemyList.push(createEnemy(walker, { x: 630, y: 300 }))

    for (let i = 0; i < 400; i++) engine.update(1 / 60, idleInput())
    engine.drainEvents()

    for (let i = 0; i < 400; i++) engine.update(1 / 60, idleInput())
    const laterEvents = engine.drainEvents().filter((e) => e.type === 'directorAnalysis')

    expect(laterEvents.length).toBe(0)
  })

  it('never announces the balanced profile', () => {
    const engine = new GameEngine(54)
    engine.player.position = { x: 480, y: 300 }

    let directorEvents = 0
    for (let i = 0; i < 60; i++) {
      engine.update(1 / 60, idleInput())
      directorEvents += engine.drainEvents().filter((e) => e.type === 'directorAnalysis').length
    }

    expect(engine.telemetry.profile).toBe('balanced')
    expect(directorEvents).toBe(0)
  })
})
