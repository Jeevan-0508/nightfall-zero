import { ARENA_HEIGHT, ARENA_WIDTH } from '../engine/types'
import type { Vector2 } from '../engine/vector'

/**
 * Tracks how the player is actually playing this run (movement, range kept
 * from enemies, distance from the arena walls) and turns that into a coarse
 * behavior profile the Director can react to. Every signal is a smoothed
 * running average, not a single-frame snapshot, so a profile only forms
 * after a few seconds of consistent behavior and never whiplashes on one
 * unusual frame.
 */
export type PlayerProfile = 'balanced' | 'kiter' | 'brawler' | 'camper' | 'edgeHugger'

export interface TelemetryState {
  sampleSeconds: number
  avgMovementSpeed: number // smoothed px/sec
  avgNearestEnemyDistance: number // smoothed px
  avgEdgeDistance: number // smoothed px to the nearest arena wall
  profile: PlayerProfile
}

export interface TelemetrySample {
  movementDistance: number // px moved this frame
  nearestEnemyDistance: number | null // null when no enemies are alive
  playerPosition: Vector2
}

const EMA_WINDOW_SECONDS = 4
const MIN_SAMPLE_SECONDS_FOR_CLASSIFICATION = 6
const NO_ENEMY_DEFAULT_DISTANCE = 480

const CAMP_SPEED_THRESHOLD = 18
const KITE_SPEED_THRESHOLD = 55
const CLOSE_RANGE_THRESHOLD = 90
const FAR_RANGE_THRESHOLD = 220
const EDGE_THRESHOLD = 70

export function createTelemetryState(): TelemetryState {
  return {
    sampleSeconds: 0,
    avgMovementSpeed: 0,
    avgNearestEnemyDistance: FAR_RANGE_THRESHOLD,
    avgEdgeDistance: Math.min(ARENA_WIDTH, ARENA_HEIGHT) / 2,
    profile: 'balanced',
  }
}

function edgeDistance(position: Vector2): number {
  return Math.min(position.x, position.y, ARENA_WIDTH - position.x, ARENA_HEIGHT - position.y)
}

export function updateTelemetry(state: TelemetryState, dt: number, sample: TelemetrySample): void {
  const alpha = Math.min(1, dt / EMA_WINDOW_SECONDS)
  const speed = sample.movementDistance / Math.max(dt, 1 / 240)
  state.avgMovementSpeed += (speed - state.avgMovementSpeed) * alpha
  state.avgNearestEnemyDistance += ((sample.nearestEnemyDistance ?? NO_ENEMY_DEFAULT_DISTANCE) - state.avgNearestEnemyDistance) * alpha
  state.avgEdgeDistance += (edgeDistance(sample.playerPosition) - state.avgEdgeDistance) * alpha
  state.sampleSeconds += dt
  state.profile = classifyProfile(state)
}

function classifyProfile(state: TelemetryState): PlayerProfile {
  if (state.sampleSeconds < MIN_SAMPLE_SECONDS_FOR_CLASSIFICATION) return 'balanced'

  if (state.avgEdgeDistance < EDGE_THRESHOLD) return 'edgeHugger'
  if (state.avgMovementSpeed < CAMP_SPEED_THRESHOLD) return 'camper'
  if (state.avgMovementSpeed >= KITE_SPEED_THRESHOLD && state.avgNearestEnemyDistance >= FAR_RANGE_THRESHOLD) return 'kiter'
  if (state.avgNearestEnemyDistance < CLOSE_RANGE_THRESHOLD) return 'brawler'
  return 'balanced'
}
