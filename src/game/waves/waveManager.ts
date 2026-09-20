import type { Rng } from '../engine/rng'
import { rangeFloat } from '../engine/rng'
import { getWaveDefinition } from '../../content/waves'
import { ARENA_HEIGHT, ARENA_WIDTH, type Obstacle, type WaveState } from '../engine/types'
import type { Vector2 } from '../engine/vector'
import { circleIntersectsAnyObstacle } from '../collision/collision'

export function createWaveState(): WaveState {
  return {
    waveIndex: 0,
    spawnQueue: [],
    spawnTimer: 0,
    enemiesAlive: 0,
    waveInProgress: false,
  }
}

function buildSpawnQueue(waveNumber: number): string[] {
  const def = getWaveDefinition(waveNumber)
  const queue: string[] = []
  for (const spawn of def.spawns) {
    for (let i = 0; i < spawn.count; i++) queue.push(spawn.defId)
  }
  return queue
}

export function startWave(state: WaveState, waveNumber: number): void {
  state.waveIndex = waveNumber
  state.spawnQueue = buildSpawnQueue(waveNumber)
  state.spawnTimer = 0
  state.enemiesAlive = state.spawnQueue.length
  state.waveInProgress = true
}

/** Picks a spawn point on the arena border, away from the player's immediate vicinity. */
export function pickSpawnPosition(rng: Rng, playerPos: Vector2, obstacles: Obstacle[] = []): Vector2 {
  const margin = 24
  const spawnRadius = 16
  for (let attempt = 0; attempt < 8; attempt++) {
    const edge = Math.floor(rangeFloat(rng, 0, 4))
    let pos: Vector2
    if (edge === 0) pos = { x: margin, y: rangeFloat(rng, margin, ARENA_HEIGHT - margin) }
    else if (edge === 1) pos = { x: ARENA_WIDTH - margin, y: rangeFloat(rng, margin, ARENA_HEIGHT - margin) }
    else if (edge === 2) pos = { x: rangeFloat(rng, margin, ARENA_WIDTH - margin), y: margin }
    else pos = { x: rangeFloat(rng, margin, ARENA_WIDTH - margin), y: ARENA_HEIGHT - margin }

    const dx = pos.x - playerPos.x
    const dy = pos.y - playerPos.y
    if (dx * dx + dy * dy > 160 * 160 && !circleIntersectsAnyObstacle(pos, spawnRadius, obstacles)) return pos
  }
  return { x: margin, y: margin }
}

export interface WaveTickResult {
  spawnDefId?: string
  waveCompleted: boolean
}

export function updateWaveManager(
  state: WaveState,
  dt: number,
  spawnIntervalMs: number,
): WaveTickResult {
  const result: WaveTickResult = { waveCompleted: false }
  if (!state.waveInProgress) return result

  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt * 1000
    if (state.spawnTimer <= 0) {
      state.spawnTimer = spawnIntervalMs
      result.spawnDefId = state.spawnQueue.shift()
    }
  } else if (state.enemiesAlive <= 0) {
    state.waveInProgress = false
    result.waveCompleted = true
  }

  return result
}

export function notifyEnemyDeath(state: WaveState): void {
  state.enemiesAlive = Math.max(0, state.enemiesAlive - 1)
}
