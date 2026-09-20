import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { brute, walker } from '../content/enemies'
import { getGameMode, gameModes } from '../content/gameModes'
import { calculateScrapEarned, computeGrade } from '../game/meta/metaProgression'
import { assaultRifle } from '../content/weapons'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

function forceWaveComplete(engine: GameEngine) {
  engine.wave.spawnQueue = []
  engine.wave.enemiesAlive = 0
  for (let i = 0; i < 60; i++) engine.update(0.1, idleInput())
}

describe('getGameMode', () => {
  it('resolves a known id', () => {
    expect(getGameMode('blitz').id).toBe('blitz')
  })

  it('falls back to standard for an unknown id', () => {
    expect(getGameMode('not-a-real-mode').id).toBe('standard')
  })

  it('ships exactly the standard, blitz, onslaught, bossRush, bloodMoon, glassCannon, and daily presets', () => {
    expect(gameModes.map((m) => m.id)).toEqual(['standard', 'blitz', 'onslaught', 'bossRush', 'bloodMoon', 'glassCannon', 'daily'])
  })

  it('only the daily mode forces a date-locked seed', () => {
    for (const mode of gameModes) {
      expect(mode.dailySeed).toBe(mode.id === 'daily')
    }
  })
})

describe('GameEngine game-mode wiring', () => {
  it('defaults to standard mode with no modifiers', () => {
    const engine = new GameEngine(1)
    expect(engine.mode.id).toBe('standard')
    expect(engine.getHudSnapshot().modeName).toBe('Standard')
  })

  it('scales freshly spawned enemy health by the mode multiplier', () => {
    const standard = new GameEngine(2, assaultRifle.id, {}, 'standard')
    standard.update(1 / 60, idleInput())
    const onslaught = new GameEngine(2, assaultRifle.id, {}, 'onslaught')
    onslaught.update(1 / 60, idleInput())

    expect(standard.enemyList[0].maxHealth).toBe(walker.health)
    expect(onslaught.enemyList[0].maxHealth).toBeCloseTo(walker.health * 1.3, 5)
  })

  it('scales incoming contact damage by the mode multiplier', () => {
    const standard = new GameEngine(3)
    standard.player.position = { x: 200, y: 200 }
    standard.player.armor = 1000
    standard.enemyList.push(createEnemy(brute, { x: 205, y: 200 }))
    standard.update(1 / 60, idleInput())

    const onslaught = new GameEngine(3, assaultRifle.id, {}, 'onslaught')
    onslaught.player.position = { x: 200, y: 200 }
    onslaught.player.armor = 1000
    onslaught.enemyList.push(createEnemy(brute, { x: 205, y: 200 }))
    onslaught.update(1 / 60, idleInput())

    const standardLoss = 1000 - standard.player.armor
    const onslaughtLoss = 1000 - onslaught.player.armor
    expect(onslaughtLoss).toBeCloseTo(standardLoss * 1.4, 5)
  })

  it('shortens the spawn interval in blitz mode', () => {
    const standard = new GameEngine(4, assaultRifle.id, {}, 'standard')
    standard.update(1 / 60, idleInput())
    const blitz = new GameEngine(4, assaultRifle.id, {}, 'blitz')
    blitz.update(1 / 60, idleInput())

    expect(blitz.wave.spawnTimer).toBeCloseTo(standard.wave.spawnTimer * 0.7, 5)
  })

  it('spawns a boss every 3 waves in blitz mode instead of every 5', () => {
    const blitz = new GameEngine(5, assaultRifle.id, {}, 'blitz')
    forceWaveComplete(blitz) // -> wave 2
    forceWaveComplete(blitz) // -> wave 3, boss should join
    expect(blitz.enemyList.some((e) => e.defId === 'overlord')).toBe(true)
  })

  it('does not spawn a boss at wave 3 in standard mode', () => {
    const standard = new GameEngine(6)
    forceWaveComplete(standard) // -> wave 2
    forceWaveComplete(standard) // -> wave 3
    expect(standard.enemyList.some((e) => e.defId === 'overlord')).toBe(false)
  })

  it('spawns a boss every 2 waves in boss rush mode', () => {
    const bossRush = new GameEngine(7, assaultRifle.id, {}, 'bossRush')
    forceWaveComplete(bossRush) // -> wave 2, boss should join
    expect(bossRush.enemyList.some((e) => e.defId === 'overlord')).toBe(true)
  })

  it('boosts outgoing weapon damage in glass cannon mode', () => {
    const standard = new GameEngine(8, assaultRifle.id, {}, 'standard')
    const glassCannon = new GameEngine(8, assaultRifle.id, {}, 'glassCannon')
    expect(glassCannon.weaponDef.damage).toBeCloseTo(standard.weaponDef.damage * 1.5, 5)
  })

  it('boosts incoming damage in glass cannon mode too, not just outgoing', () => {
    const glassCannon = new GameEngine(9, assaultRifle.id, {}, 'glassCannon')
    glassCannon.player.position = { x: 200, y: 200 }
    glassCannon.player.armor = 1000
    glassCannon.enemyList.push(createEnemy(brute, { x: 205, y: 200 }))
    glassCannon.update(1 / 60, idleInput())

    const standard = new GameEngine(9)
    standard.player.position = { x: 200, y: 200 }
    standard.player.armor = 1000
    standard.enemyList.push(createEnemy(brute, { x: 205, y: 200 }))
    standard.update(1 / 60, idleInput())

    const glassCannonLoss = 1000 - glassCannon.player.armor
    const standardLoss = 1000 - standard.player.armor
    expect(glassCannonLoss).toBeCloseTo(standardLoss * 1.6, 5)
  })

  it('reduces enemy health but increases damage and spawn rate in blood moon mode', () => {
    const standard = new GameEngine(10, assaultRifle.id, {}, 'standard')
    standard.update(1 / 60, idleInput())
    const bloodMoon = new GameEngine(10, assaultRifle.id, {}, 'bloodMoon')
    bloodMoon.update(1 / 60, idleInput())

    expect(bloodMoon.enemyList[0].maxHealth).toBeCloseTo(walker.health * 0.85, 5)
    expect(bloodMoon.wave.spawnTimer).toBeCloseTo(standard.wave.spawnTimer * 0.75, 5)
  })
})

describe('computeGrade', () => {
  it('grades a short run D', () => {
    expect(computeGrade(1)).toBe('D')
  })

  it('grades a mid-length run B or C depending on wave', () => {
    expect(computeGrade(3)).toBe('C')
    expect(computeGrade(6)).toBe('B')
  })

  it('grades a long run A, and an exceptional one S', () => {
    expect(computeGrade(10)).toBe('A')
    expect(computeGrade(15)).toBe('S')
    expect(computeGrade(50)).toBe('S')
  })
})

describe('calculateScrapEarned with a mode multiplier', () => {
  it('boosts payout by the mode scrap multiplier', () => {
    const result = { survivalTime: 30, kills: 10, waveReached: 2 }
    const base = calculateScrapEarned(result, {})
    const onslaughtEarned = calculateScrapEarned(result, {}, getGameMode('onslaught').scrapMultiplier)
    expect(onslaughtEarned).toBe(Math.floor(base * 1.5))
  })
})
