import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import {
  breathe,
  getEnemyAnimState,
  getPlayerAnimState,
  isSpitterTelegraphing,
  isStrideImpactBeat,
  strideAmplitude,
  walkPhase,
} from '../game/render/animation/animation'

describe('getPlayerAnimState', () => {
  it('prioritizes death over every other pose', () => {
    const engine = new GameEngine(1)
    engine.status = 'dead'
    engine.playerHitFlash = 0.1
    expect(getPlayerAnimState(engine).pose).toBe('death')
  })

  it('prioritizes a fresh hit-flash over reload/shoot/ability', () => {
    const engine = new GameEngine(2)
    engine.playerHitFlash = 0.1
    engine.recoilAmount = 10
    expect(getPlayerAnimState(engine).pose).toBe('hit')
  })

  it('reads reload when the equipped weapon is mid-reload and not hit', () => {
    const engine = new GameEngine(3)
    engine.playerHitFlash = 0
    engine.player.weapons[engine.player.equippedWeaponId].reloading = true
    expect(getPlayerAnimState(engine).pose).toBe('reload')
  })

  it('reads shoot from a fresh recoil kick when not reloading or hit', () => {
    const engine = new GameEngine(4)
    engine.playerHitFlash = 0
    engine.recoilAmount = 5
    expect(getPlayerAnimState(engine).pose).toBe('shoot')
  })

  it('reads ability when an ability is active and nothing higher-priority is happening', () => {
    const engine = new GameEngine(5)
    engine.playerHitFlash = 0
    engine.recoilAmount = 0
    const abilityId = Object.keys(engine.player.abilities)[0]
    engine.player.abilities[abilityId].activeRemaining = 1
    expect(getPlayerAnimState(engine).pose).toBe('ability')
  })

  it('falls back to move when nothing else applies, and derives speedRatio from real velocity', () => {
    const engine = new GameEngine(6)
    engine.player.velocity = { x: 220, y: 0 }
    const state = getPlayerAnimState(engine)
    expect(state.pose).toBe('move')
    expect(state.speedRatio).toBeCloseTo(1, 1)
  })

  it('flags lowHealth under the 25% threshold, but never while dead', () => {
    const engine = new GameEngine(7)
    engine.player.health = engine.player.maxHealth * 0.1
    expect(getPlayerAnimState(engine).lowHealth).toBe(true)
    engine.status = 'dead'
    expect(getPlayerAnimState(engine).lowHealth).toBe(false)
  })
})

describe('walkPhase / strideAmplitude / breathe', () => {
  it('increases stride frequency as speedRatio rises', () => {
    const slow = walkPhase(1, 0)
    const fast = walkPhase(1, 2)
    expect(fast).toBeGreaterThan(slow)
  })

  it('has zero stride amplitude near-idle, ramping to 1 by a full walking pace', () => {
    expect(strideAmplitude(0)).toBe(0)
    expect(strideAmplitude(0.8)).toBeCloseTo(1, 5)
    expect(strideAmplitude(2)).toBe(1)
  })

  it('breathes as a bounded oscillation', () => {
    for (let t = 0; t < 10; t += 0.3) {
      expect(breathe(t)).toBeGreaterThanOrEqual(-1)
      expect(breathe(t)).toBeLessThanOrEqual(1)
    }
  })
})

describe('getEnemyAnimState', () => {
  it('faces toward the player when nearly stationary', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    enemy.velocity = { x: 0, y: 0 }
    const state = getEnemyAnimState(enemy, { x: 100, y: 0 }, 0)
    expect(state.facing).toBeCloseTo(0, 5)
  })

  it('faces along real velocity once moving, even if that differs from the player direction', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    enemy.velocity = { x: 0, y: 90 }
    const state = getEnemyAnimState(enemy, { x: 100, y: 0 }, 0)
    expect(state.facing).toBeCloseTo(Math.PI / 2, 5)
  })
})

describe('isSpitterTelegraphing', () => {
  it('is true only in the brief window just before rangedCooldown reaches zero', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    enemy.rangedCooldown = 0.1
    expect(isSpitterTelegraphing(enemy)).toBe(true)
    enemy.rangedCooldown = 2
    expect(isSpitterTelegraphing(enemy)).toBe(false)
    enemy.rangedCooldown = 0
    expect(isSpitterTelegraphing(enemy)).toBe(false)
  })
})

describe('isStrideImpactBeat', () => {
  it('only fires near the peak of a strong-enough stride swing', () => {
    expect(isStrideImpactBeat(Math.PI / 2, 0.5)).toBe(true)
    expect(isStrideImpactBeat(0, 0.5)).toBe(false)
    expect(isStrideImpactBeat(Math.PI / 2, 0.1)).toBe(false)
  })
})
