import { afterEach, describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { clearRunFromStorage, loadRunFromStorage, restoreRun, saveRunToStorage, serializeRun } from '../game/engine/persistence'
import { assaultRifle, sniper } from '../content/weapons'
import { upgradePool } from '../content/upgrades'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'

afterEach(() => {
  clearRunFromStorage()
})

describe('serializeRun / restoreRun (checkpoint round-trip)', () => {
  it('restores the player, stats, telemetry, director, and mode/map exactly as saved', () => {
    const engine = new GameEngine(300, sniper.id, {}, 'blitz')
    engine.player.health = 42
    engine.player.xp = 17
    engine.player.level = 3
    engine.stats.kills = 9
    engine.stats.survivalTime = 123.5
    engine.telemetry.profile = 'brawler'
    engine.director.intensity = 0.6
    engine.chosenUpgrades = [upgradePool[0], upgradePool[1]]
    engine.wave.waveIndex = 4

    const saved = serializeRun(engine)
    const restored = restoreRun(saved)

    expect(restored.player.health).toBe(42)
    expect(restored.player.xp).toBe(17)
    expect(restored.player.level).toBe(3)
    expect(restored.player.equippedWeaponId).toBe(sniper.id)
    expect(restored.stats.kills).toBe(9)
    expect(restored.stats.survivalTime).toBe(123.5)
    expect(restored.telemetry.profile).toBe('brawler')
    expect(restored.director.intensity).toBe(0.6)
    expect(restored.mode.id).toBe('blitz')
    expect(restored.map.id).toBe(engine.map.id)
    expect(restored.chosenUpgrades.map((u) => u.id)).toEqual([upgradePool[0].id, upgradePool[1].id])
  })

  it('restarts the saved wave fresh - a full spawn queue, no leftover enemies, no lingering run event', () => {
    const engine = new GameEngine(301, assaultRifle.id, {}, 'blitz')
    engine.wave.waveIndex = 5
    engine.enemyList.push(createEnemy(walker, { x: 10, y: 10 }))
    engine.runEvents.active = { kind: 'blackout', remaining: 5, totalDuration: 9 }

    const restored = restoreRun(serializeRun(engine))

    expect(restored.enemyList).toEqual([])
    expect(restored.wave.waveIndex).toBe(5)
    expect(restored.wave.waveInProgress).toBe(true)
    expect(restored.wave.spawnQueue.length).toBeGreaterThan(0)
    expect(restored.runEvents.active).toBeNull()
  })

  it('a restored engine keeps updating normally - it is a real playable GameEngine, not a frozen snapshot', () => {
    const engine = new GameEngine(302, assaultRifle.id, {}, 'blitz')
    engine.player.position = { x: 100, y: 100 }
    const restored = restoreRun(serializeRun(engine))

    const positionBefore = { ...restored.player.position }
    restored.update(1 / 60, {
      up: false,
      down: true,
      left: false,
      right: false,
      aimX: 100,
      aimY: 100,
      firing: false,
      switchTo: null,
      abilityTrigger: null,
    })

    expect(restored.player.position.y).toBeGreaterThan(positionBefore.y)
  })

  it('mutating the restored player does not affect the original engine (a deep, not shallow, restore)', () => {
    const engine = new GameEngine(303)
    const restored = restoreRun(serializeRun(engine))

    restored.player.health = 1
    expect(engine.player.health).not.toBe(1)
  })
})

describe('saveRunToStorage / loadRunFromStorage / clearRunFromStorage', () => {
  it('round-trips a playing run through localStorage', () => {
    const engine = new GameEngine(304)
    engine.wave.waveIndex = 2
    expect(loadRunFromStorage()).toBeNull()

    saveRunToStorage(engine)
    const loaded = loadRunFromStorage()

    expect(loaded).not.toBeNull()
    expect(loaded?.waveIndex).toBe(2)
    expect(loaded?.seed).toBe(engine.seed)
  })

  it('never saves a run that is not actively playing', () => {
    const engine = new GameEngine(305)
    engine.status = 'dead'

    saveRunToStorage(engine)

    expect(loadRunFromStorage()).toBeNull()
  })

  it('clearRunFromStorage removes a previously saved run', () => {
    const engine = new GameEngine(306)
    saveRunToStorage(engine)
    expect(loadRunFromStorage()).not.toBeNull()

    clearRunFromStorage()

    expect(loadRunFromStorage()).toBeNull()
  })

  it('treats corrupt or version-mismatched storage as no save at all', () => {
    localStorage.setItem('nightfall-zero-run-save', '{ not valid json')
    expect(loadRunFromStorage()).toBeNull()

    localStorage.setItem('nightfall-zero-run-save', JSON.stringify({ version: 999, waveIndex: 1 }))
    expect(loadRunFromStorage()).toBeNull()
  })
})
