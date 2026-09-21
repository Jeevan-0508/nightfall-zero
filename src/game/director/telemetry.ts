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

/**
 * Which weapon archetype the player is leaning on this run. Only the four
 * weapons with a distinct combat identity get their own archetype (sniper's
 * long-range precision, flamethrower's close-range DoT spam, rocket
 * launcher's burst AoE, energy weapon's pierce); pistol/shotgun/smg/assault
 * rifle are the "generic gun" baseline and never push the classification
 * off 'balanced' on their own.
 */
export type WeaponProfile = 'balanced' | 'sniper' | 'flamethrower' | 'explosive' | 'energy'

export const WEAPON_ARCHETYPE: Record<string, WeaponProfile> = {
  sniper: 'sniper',
  flamethrower: 'flamethrower',
  'rocket-launcher': 'explosive',
  'energy-weapon': 'energy',
}

export interface TelemetryState {
  sampleSeconds: number
  avgMovementSpeed: number // smoothed px/sec
  avgNearestEnemyDistance: number // smoothed px
  avgEdgeDistance: number // smoothed px to the nearest arena wall
  profile: PlayerProfile
  weaponShotCounts: Record<WeaponProfile, number> // recency-weighted, decayed on every recorded shot
  trackedShots: number // total archetype-weapon shots ever recorded (drives the classification gate)
  weaponProfile: WeaponProfile
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

const WEAPON_MEMORY_DECAY = 0.985 // per recorded shot, so usage naturally shifts if the player switches weapons
const MIN_SHOTS_FOR_WEAPON_CLASSIFICATION = 12
const WEAPON_DOMINANCE_SHARE = 0.55

export function createTelemetryState(): TelemetryState {
  return {
    sampleSeconds: 0,
    avgMovementSpeed: 0,
    avgNearestEnemyDistance: FAR_RANGE_THRESHOLD,
    avgEdgeDistance: Math.min(ARENA_WIDTH, ARENA_HEIGHT) / 2,
    profile: 'balanced',
    weaponShotCounts: { balanced: 0, sniper: 0, flamethrower: 0, explosive: 0, energy: 0 },
    trackedShots: 0,
    weaponProfile: 'balanced',
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

/**
 * Called once per shot fired. Decays every archetype's count first so usage
 * is recency-weighted (switching weapons mid-run actually shifts the
 * profile, it doesn't just average against everything fired since spawn),
 * then adds this shot to its archetype, if it has one - a generic gun shot
 * still decays the others but adds nothing, gently pulling the profile back
 * toward 'balanced' the more a player mixes in baseline weapons.
 */
export function recordWeaponShot(state: TelemetryState, weaponId: string): void {
  for (const key of Object.keys(state.weaponShotCounts) as WeaponProfile[]) {
    state.weaponShotCounts[key] *= WEAPON_MEMORY_DECAY
  }
  const archetype = WEAPON_ARCHETYPE[weaponId]
  if (archetype) {
    state.weaponShotCounts[archetype] += 1
    state.trackedShots += 1
  }
  state.weaponProfile = classifyWeaponProfile(state)
}

function classifyWeaponProfile(state: TelemetryState): WeaponProfile {
  if (state.trackedShots < MIN_SHOTS_FOR_WEAPON_CLASSIFICATION) return 'balanced'

  let total = 0
  let topArchetype: WeaponProfile = 'balanced'
  let topCount = 0
  for (const key of Object.keys(state.weaponShotCounts) as WeaponProfile[]) {
    const count = state.weaponShotCounts[key]
    total += count
    if (key !== 'balanced' && count > topCount) {
      topCount = count
      topArchetype = key
    }
  }
  if (total <= 0) return 'balanced'
  return topCount / total >= WEAPON_DOMINANCE_SHARE ? topArchetype : 'balanced'
}
