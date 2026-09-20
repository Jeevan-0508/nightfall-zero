import { describe, expect, it } from 'vitest'
import { hashSeed } from '../game/engine/rng'
import { GameEngine } from '../game/engine/GameEngine'
import type { InputState } from '../game/engine/types'

function scriptedInput(tick: number): InputState {
  const phase = tick % 4
  return {
    up: phase === 0,
    down: phase === 2,
    left: phase === 1,
    right: phase === 3,
    aimX: 200 + Math.sin(tick) * 150,
    aimY: 200 + Math.cos(tick) * 150,
    firing: tick % 3 === 0,
    switchTo: null,
    abilityTrigger: null,
  }
}

describe('hashSeed', () => {
  it('is deterministic for the same string', () => {
    expect(hashSeed('friend-code')).toBe(hashSeed('friend-code'))
  })

  it('produces different hashes for different strings', () => {
    expect(hashSeed('alpha')).not.toBe(hashSeed('beta'))
  })

  it('always returns a valid uint32', () => {
    for (const input of ['', 'a', 'the quick night', '12345', '💀']) {
      const hash = hashSeed(input)
      expect(Number.isInteger(hash)).toBe(true)
      expect(hash).toBeGreaterThanOrEqual(0)
      expect(hash).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('does not throw on an empty string and stays stable', () => {
    expect(hashSeed('')).toBe(hashSeed(''))
  })
})

describe('GameEngine.seed', () => {
  it('stores the normalized (>>> 0) seed it was constructed with', () => {
    const engine = new GameEngine(42)
    expect(engine.seed).toBe(42)
  })

  it('normalizes a hashed seed the same way for identical input', () => {
    const seed = hashSeed('shared-with-a-friend')
    const engine = new GameEngine(seed)
    expect(engine.seed).toBe(seed >>> 0)
  })
})

describe('replay determinism', () => {
  it('produces byte-for-byte identical state from the same seed and inputs', () => {
    const seed = hashSeed('replay-me')
    const a = new GameEngine(seed)
    const b = new GameEngine(seed)

    for (let tick = 0; tick < 300; tick++) {
      const input = scriptedInput(tick)
      a.update(1 / 60, input)
      b.update(1 / 60, input)
    }

    expect(a.enemyList.length).toBe(b.enemyList.length)
    expect(a.enemyList.map((e) => e.position)).toEqual(b.enemyList.map((e) => e.position))
    expect(a.player.position).toEqual(b.player.position)
    expect(a.player.health).toBe(b.player.health)
    expect(a.stats.kills).toBe(b.stats.kills)
    expect(a.wave.waveIndex).toBe(b.wave.waveIndex)
  })

  it('diverges when the seed differs', () => {
    const a = new GameEngine(hashSeed('seed-one'))
    const b = new GameEngine(hashSeed('seed-two'))

    for (let tick = 0; tick < 300; tick++) {
      const input = scriptedInput(tick)
      a.update(1 / 60, input)
      b.update(1 / 60, input)
    }

    const aPositions = a.enemyList.map((e) => e.position)
    const bPositions = b.enemyList.map((e) => e.position)
    expect(aPositions).not.toEqual(bPositions)
  })
})
