import { describe, expect, it } from 'vitest'
import { createWaveState, startWave, updateWaveManager, notifyEnemyDeath } from '../game/waves/waveManager'
import { getWaveDefinition } from '../content/waves'

describe('waveManager', () => {
  it('spawns the full authored enemy count for wave 1 over time', () => {
    const state = createWaveState()
    startWave(state, 1)
    const def = getWaveDefinition(1)
    const expectedCount = def.spawns.reduce((sum, s) => sum + s.count, 0)

    let spawned = 0
    for (let i = 0; i < 200 && spawned < expectedCount; i++) {
      const result = updateWaveManager(state, 1, def.spawnIntervalMs)
      if (result.spawnDefId) spawned += 1
    }

    expect(spawned).toBe(expectedCount)
    expect(state.enemiesAlive).toBe(expectedCount)
  })

  it('only completes once every spawned enemy has died', () => {
    const state = createWaveState()
    startWave(state, 1)
    const def = getWaveDefinition(1)
    const totalEnemies = def.spawns.reduce((sum, s) => sum + s.count, 0)

    while (state.spawnQueue.length > 0) {
      updateWaveManager(state, 1, def.spawnIntervalMs)
    }

    let result = updateWaveManager(state, 1, def.spawnIntervalMs)
    expect(result.waveCompleted).toBe(false)

    for (let i = 0; i < totalEnemies - 1; i++) notifyEnemyDeath(state)
    result = updateWaveManager(state, 1, def.spawnIntervalMs)
    expect(result.waveCompleted).toBe(false)

    notifyEnemyDeath(state)
    result = updateWaveManager(state, 1, def.spawnIntervalMs)
    expect(result.waveCompleted).toBe(true)
    expect(state.waveInProgress).toBe(false)
  })
})
