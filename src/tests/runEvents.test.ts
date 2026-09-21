import { describe, expect, it } from 'vitest'
import {
  createRunEventState,
  tickRunEvent,
  endActiveRunEvent,
  maybeStartRunEvent,
  isRunEventActive,
} from '../game/events/runEvents'
import type { Rng } from '../game/engine/rng'
import { GameEngine } from '../game/engine/GameEngine'
import { createPickup } from '../game/entities/factories'
import type { InputState } from '../game/engine/types'

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

/** Returns each queued value in order, then repeats the last one - lets a test pin exactly
 * which rng() call drives the chance roll vs. the kind pick without guessing a shared constant. */
function sequenceRng(values: number[]): Rng {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

describe('runEvents (pure state machine)', () => {
  it('never starts an event before wave 3, even when the roll would otherwise succeed', () => {
    const state = createRunEventState()
    expect(maybeStartRunEvent(state, 1, sequenceRng([0, 0]))).toBeNull()
    expect(maybeStartRunEvent(state, 2, sequenceRng([0, 0]))).toBeNull()
    expect(state.active).toBeNull()
  })

  it('does not start an event when the chance roll fails', () => {
    const state = createRunEventState()
    expect(maybeStartRunEvent(state, 3, sequenceRng([0.99, 0]))).toBeNull()
    expect(state.active).toBeNull()
  })

  it('picks blackout, hunted, or supplyDrop based on the roll, with matching durations', () => {
    const blackoutState = createRunEventState()
    expect(maybeStartRunEvent(blackoutState, 3, sequenceRng([0, 0]))).toBe('blackout')
    expect(blackoutState.active).toEqual({ kind: 'blackout', remaining: 9, totalDuration: 9 })

    const huntedState = createRunEventState()
    expect(maybeStartRunEvent(huntedState, 3, sequenceRng([0, 0.5]))).toBe('hunted')
    expect(huntedState.active).toEqual({ kind: 'hunted', remaining: 10, totalDuration: 10 })

    const supplyDropState = createRunEventState()
    expect(maybeStartRunEvent(supplyDropState, 3, sequenceRng([0, 0.99]))).toBe('supplyDrop')
    expect(supplyDropState.active).toEqual({ kind: 'supplyDrop', remaining: 14, totalDuration: 14 })
  })

  it('never starts a second event while one is already active', () => {
    const state = createRunEventState()
    maybeStartRunEvent(state, 3, sequenceRng([0, 0]))
    expect(maybeStartRunEvent(state, 4, sequenceRng([0, 0]))).toBeNull()
    expect(state.active?.kind).toBe('blackout')
  })

  it('starts a cooldown once an event ends and blocks a new roll until it clears', () => {
    const state = createRunEventState()
    maybeStartRunEvent(state, 3, sequenceRng([0, 0]))
    endActiveRunEvent(state)
    expect(state.active).toBeNull()
    expect(state.cooldownRemaining).toBeGreaterThan(0)
    expect(maybeStartRunEvent(state, 4, sequenceRng([0, 0]))).toBeNull()

    tickRunEvent(state, state.cooldownRemaining + 0.1)
    expect(state.cooldownRemaining).toBe(0)
    expect(maybeStartRunEvent(state, 5, sequenceRng([0, 0]))).toBe('blackout')
  })

  it('expires the active event once its full duration elapses', () => {
    const state = createRunEventState()
    maybeStartRunEvent(state, 3, sequenceRng([0, 0.5])) // hunted, duration 10
    tickRunEvent(state, 9.9)
    expect(state.active).not.toBeNull()
    tickRunEvent(state, 0.2)
    expect(state.active).toBeNull()
  })

  it('reports the active kind through isRunEventActive', () => {
    const state = createRunEventState()
    maybeStartRunEvent(state, 3, sequenceRng([0, 0]))
    expect(isRunEventActive(state, 'blackout')).toBe(true)
    expect(isRunEventActive(state, 'hunted')).toBe(false)
  })
})

describe('GameEngine run event integration', () => {
  it('surfaces the active run event in the HUD snapshot, and clears it when none is active', () => {
    const engine = new GameEngine(200)
    expect(engine.getHudSnapshot().runEvent).toBeNull()

    engine.runEvents.active = { kind: 'blackout', remaining: 4, totalDuration: 9 }
    const snapshot = engine.getHudSnapshot().runEvent
    expect(snapshot).toEqual({ kind: 'blackout', remaining: 4, totalDuration: 9 })
  })

  it('shows a HUD event toast when the Overcharge ability activates', () => {
    const engine = new GameEngine(201)
    engine.player.abilities.overcharge.cooldownRemaining = 0

    engine.update(1 / 60, idleInput({ abilityTrigger: 'overcharge' }))

    expect(engine.drainEvents().map((e) => e.type)).toContain('overchargeActivated')
    expect(engine.getHudSnapshot().eventToast?.text).toMatch(/OVERCHARGE/)
  })

  it('shows a HUD event toast the instant a real Blackout, Hunted, or Supply Drop roll starts one', () => {
    const engine = new GameEngine(205)
    engine.player.health = 99999
    engine.player.armor = 99999
    let toastConfirmed = false

    for (let wave = 0; wave < 30 && !toastConfirmed; wave++) {
      engine.wave.spawnQueue = []
      engine.wave.enemiesAlive = 0
      for (let i = 0; i < 60 && !toastConfirmed; i++) {
        engine.update(0.1, idleInput())
        const firedStart = engine
          .drainEvents()
          .some((e) => e.type === 'blackoutStart' || e.type === 'huntedStart' || e.type === 'supplyDropSpawned')
        if (firedStart) toastConfirmed = engine.getHudSnapshot().eventToast !== null
      }
    }

    expect(toastConfirmed).toBe(true)
  })

  it('speeds up enemy spawning while Hunted is active, compared to an identical engine with no event', () => {
    const baseline = new GameEngine(202)
    const hunted = new GameEngine(202)
    hunted.runEvents.active = { kind: 'hunted', remaining: 999, totalDuration: 999 }

    function ticksToEmptySpawnQueue(engine: GameEngine): number {
      let ticks = 0
      while (engine.wave.spawnQueue.length > 0 && ticks < 5000) {
        engine.update(1 / 60, idleInput())
        ticks++
      }
      return ticks
    }

    const baselineTicks = ticksToEmptySpawnQueue(baseline)
    const huntedTicks = ticksToEmptySpawnQueue(hunted)

    expect(huntedTicks).toBeLessThan(baselineTicks)
  })

  it('collecting a Supply Drop heals the player, awards XP, and ends the event immediately', () => {
    const engine = new GameEngine(203)
    engine.player.health = engine.player.maxHealth * 0.5
    engine.player.position = { x: 100, y: 100 }
    engine.pickups.push(createPickup({ x: 100, y: 100 }, 14))
    engine.runEvents.active = { kind: 'supplyDrop', remaining: 14, totalDuration: 14 }
    const healthBefore = engine.player.health
    const xpBefore = engine.player.xp
    const levelBefore = engine.player.level

    engine.update(1 / 60, idleInput())

    expect(engine.pickups.length).toBe(0)
    expect(engine.player.health).toBeGreaterThan(healthBefore)
    expect(engine.player.xp > xpBefore || engine.player.level > levelBefore).toBe(true)
    expect(engine.runEvents.active).toBeNull()
    expect(engine.drainEvents().map((e) => e.type)).toContain('supplyDropCollected')
  })

  it('lets a Supply Drop pickup expire untouched if the player never reaches it', () => {
    const engine = new GameEngine(204)
    engine.player.position = { x: 0, y: 0 }
    engine.pickups.push(createPickup({ x: 900, y: 900 }, 0.05))

    engine.update(0.1, idleInput())

    expect(engine.pickups.length).toBe(0)
    expect(engine.drainEvents().map((e) => e.type)).not.toContain('supplyDropCollected')
  })

  it('eventually rolls at least one run event across many forced wave completions', () => {
    const engine = new GameEngine(205)
    engine.player.health = 99999
    engine.player.armor = 99999
    const seenEventStarts: string[] = []

    for (let wave = 0; wave < 30; wave++) {
      engine.wave.spawnQueue = []
      engine.wave.enemiesAlive = 0
      for (let i = 0; i < 60; i++) {
        engine.update(0.1, idleInput())
        for (const event of engine.drainEvents()) {
          if (event.type === 'blackoutStart' || event.type === 'huntedStart' || event.type === 'supplyDropSpawned') {
            seenEventStarts.push(event.type)
          }
        }
      }
      if (engine.runEvents.active) engine.runEvents.active = null
    }

    expect(seenEventStarts.length).toBeGreaterThan(0)
  })

  it('never rolls a run event while waveIndex is below 3, no matter how many waves are forced through', () => {
    const engine = new GameEngine(206)
    engine.player.health = 99999
    engine.player.armor = 99999
    let sawEventBelowWave3 = false

    for (let wave = 0; wave < 10; wave++) {
      engine.wave.spawnQueue = []
      engine.wave.enemiesAlive = 0
      for (let i = 0; i < 60; i++) {
        engine.update(0.1, idleInput())
        if (engine.wave.waveIndex < 3 && engine.runEvents.active) sawEventBelowWave3 = true
      }
    }

    expect(sawEventBelowWave3).toBe(false)
  })
})
