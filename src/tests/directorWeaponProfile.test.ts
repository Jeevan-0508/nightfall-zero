import { describe, expect, it } from 'vitest'
import { createTelemetryState, recordWeaponShot, type TelemetryState } from '../game/director/telemetry'
import { applyWeaponProfileCounter, WEAPON_PROFILE_COUNTER_RANK } from '../game/director/director'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import { sniper, flamethrower, rocketLauncher, energyWeapon, pistol } from '../content/weapons'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

function fireShots(state: TelemetryState, weaponId: string, count: number): void {
  for (let i = 0; i < count; i++) recordWeaponShot(state, weaponId)
}

describe('weapon-usage classification', () => {
  it('stays balanced until enough archetype shots have accumulated', () => {
    const state = createTelemetryState()
    fireShots(state, sniper.id, 5)
    expect(state.weaponProfile).toBe('balanced')
  })

  it('classifies a sniper-heavy player once sniper shots dominate', () => {
    const state = createTelemetryState()
    fireShots(state, sniper.id, 20)
    expect(state.weaponProfile).toBe('sniper')
  })

  it('classifies a flamethrower-heavy player once flamethrower shots dominate', () => {
    const state = createTelemetryState()
    fireShots(state, flamethrower.id, 20)
    expect(state.weaponProfile).toBe('flamethrower')
  })

  it('classifies a rocket-launcher-heavy player as explosive', () => {
    const state = createTelemetryState()
    fireShots(state, rocketLauncher.id, 20)
    expect(state.weaponProfile).toBe('explosive')
  })

  it('classifies an energy-weapon-heavy player as energy', () => {
    const state = createTelemetryState()
    fireShots(state, energyWeapon.id, 20)
    expect(state.weaponProfile).toBe('energy')
  })

  it('never classifies off generic-gun shots alone (pistol has no archetype)', () => {
    const state = createTelemetryState()
    fireShots(state, pistol.id, 40)
    expect(state.weaponProfile).toBe('balanced')
    expect(state.trackedShots).toBe(0)
  })

  it('shifts profile when the player switches weapons, thanks to recency decay', () => {
    const state = createTelemetryState()
    fireShots(state, sniper.id, 20)
    expect(state.weaponProfile).toBe('sniper')

    fireShots(state, flamethrower.id, 40)
    expect(state.weaponProfile).toBe('flamethrower')
  })

  it('falls back to balanced when usage is split evenly across archetypes', () => {
    const state = createTelemetryState()
    fireShots(state, sniper.id, 10)
    fireShots(state, flamethrower.id, 10)
    expect(state.weaponProfile).toBe('balanced')
  })
})

describe('applyWeaponProfileCounter', () => {
  it('is a no-op for the balanced profile', () => {
    const queue = ['walker', 'brute', 'runner']
    applyWeaponProfileCounter(queue, 'balanced')
    expect(queue).toEqual(['walker', 'brute', 'runner'])
  })

  it('pulls the runner forward against a sniper main', () => {
    const queue = ['walker', 'brute', 'runner', 'spitter']
    applyWeaponProfileCounter(queue, 'sniper')
    expect(queue[0]).toBe('runner')
  })

  it('pulls the spitter forward against a flamethrower main', () => {
    const queue = ['walker', 'brute', 'spitter']
    applyWeaponProfileCounter(queue, 'flamethrower')
    expect(queue[0]).toBe('spitter')
  })

  it('pulls the runner forward against a rocket-launcher main', () => {
    const queue = ['walker', 'brute', 'runner']
    applyWeaponProfileCounter(queue, 'explosive')
    expect(queue[0]).toBe('runner')
  })

  it('pulls the stalker forward against an energy-weapon main', () => {
    const queue = ['walker', 'brute', 'stalker']
    applyWeaponProfileCounter(queue, 'energy')
    expect(queue[0]).toBe('stalker')
  })

  it('every non-balanced weapon profile has a defined counter map', () => {
    const profiles = Object.keys(WEAPON_PROFILE_COUNTER_RANK) as (keyof typeof WEAPON_PROFILE_COUNTER_RANK)[]
    for (const profile of profiles) {
      if (profile === 'balanced') continue
      expect(Object.keys(WEAPON_PROFILE_COUNTER_RANK[profile]).length).toBeGreaterThan(0)
    }
  })
})

describe('GameEngine weapon-usage integration', () => {
  it('tracks real fired shots through the engine and exposes the profile via the HUD debug snapshot', () => {
    const engine = new GameEngine(60)
    engine.update(1 / 60, idleInput({ switchTo: sniper.id }))
    engine.player.health = 99999
    engine.player.armor = 99999

    const input = idleInput({ aimX: 500, aimY: 300, firing: true })
    for (let i = 0; i < 3000 && engine.telemetry.weaponProfile !== 'sniper'; i++) {
      engine.update(1 / 60, input)
    }

    expect(engine.telemetry.weaponProfile).toBe('sniper')
    expect(engine.getHudSnapshot().debug.weaponProfile).toBe('sniper')
  })

  it('does not track shots fired from weapons with no archetype', () => {
    const engine = new GameEngine(61)
    engine.update(1 / 60, idleInput({ switchTo: pistol.id }))
    engine.player.health = 99999
    engine.player.armor = 99999

    const input = idleInput({ aimX: 500, aimY: 300, firing: true })
    for (let i = 0; i < 120; i++) engine.update(1 / 60, input)

    expect(engine.telemetry.trackedShots).toBe(0)
    expect(engine.telemetry.weaponProfile).toBe('balanced')
  })
})

describe('pierce-arc visual (energy weapon)', () => {
  it('spawns a dashTrail-kind particle bridging a piercing hit to its next target', () => {
    const engine = new GameEngine(62)
    engine.update(1 / 60, idleInput({ switchTo: energyWeapon.id }))
    engine.player.position = { x: 100, y: 100 }

    const front = createEnemy(walker, { x: 200, y: 100 })
    const back = createEnemy(walker, { x: 260, y: 100 })
    engine.enemyList.push(front, back)

    const input = idleInput({ aimX: 400, aimY: 100, firing: true })
    let sawArc = false
    for (let i = 0; i < 120 && !sawArc; i++) {
      engine.update(1 / 60, input)
      sawArc = engine.particles.some((p) => p.kind === 'dashTrail')
    }

    expect(sawArc).toBe(true)
  })
})
