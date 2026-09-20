import { clamp } from '../engine/vector'

/**
 * The Adaptive Director watches how the run is going and nudges pacing in
 * response, the way Left 4 Dead's AI Director paces a level: give a player
 * who is cruising a harder push, and back off when they're getting hammered.
 * It never invents new enemy types or breaks wave-authoring, it only
 * resequences a wave's own spawn queue and stretches/compresses the spawn
 * interval that wave already defined.
 */
export interface DirectorState {
  intensity: number // 0..1 rolling "heat" score
  calmTimer: number // seconds remaining in a forced relief window (0 = none active)
}

export interface DirectorSignals {
  damageTaken: number // player health+armor lost this frame
  killsThisFrame: number
  healthRatio: number // player.health / player.maxHealth
}

export interface SpawnModifier {
  intervalMultiplier: number // >1 slows spawns down, <1 speeds them up
  toughEnemyBias: number // -1..1: negative pulls easier enemies forward, positive pulls harder ones forward
}

const DECAY_RATE = 0.05 // intensity per second of quiet
const HIT_WEIGHT = 0.008 // intensity per point of damage taken
const KILL_WEIGHT = 0.03 // intensity per kill
const LOW_HEALTH_WEIGHT = 0.15 // intensity per second while under LOW_HEALTH_RATIO
const LOW_HEALTH_RATIO = 0.3
const PEAK_THRESHOLD = 0.85
const RELIEF_DURATION = 6

export function createDirectorState(): DirectorState {
  return { intensity: 0, calmTimer: 0 }
}

export function updateDirector(state: DirectorState, dt: number, signals: DirectorSignals): void {
  if (state.calmTimer > 0) {
    state.calmTimer = Math.max(0, state.calmTimer - dt)
  }

  state.intensity = Math.max(0, state.intensity - dt * DECAY_RATE)
  state.intensity += signals.damageTaken * HIT_WEIGHT
  state.intensity += signals.killsThisFrame * KILL_WEIGHT
  if (signals.healthRatio < LOW_HEALTH_RATIO) {
    state.intensity += dt * LOW_HEALTH_WEIGHT
  }
  state.intensity = clamp(state.intensity, 0, 1)

  if (state.intensity >= PEAK_THRESHOLD && state.calmTimer <= 0) {
    state.calmTimer = RELIEF_DURATION
    state.intensity *= 0.5
  }
}

/** Smoothly ramps pacing up when the player is cruising, and eases off as intensity climbs. */
export function getSpawnModifier(state: DirectorState): SpawnModifier {
  if (state.calmTimer > 0) {
    return { intervalMultiplier: 1.5, toughEnemyBias: -0.4 }
  }
  if (state.intensity < 0.25) {
    const t = (0.25 - state.intensity) / 0.25
    return { intervalMultiplier: 1 - t * 0.35, toughEnemyBias: t * 0.6 }
  }
  if (state.intensity > 0.55) {
    const t = Math.min(1, (state.intensity - 0.55) / 0.35)
    return { intervalMultiplier: 1 + t * 0.3, toughEnemyBias: -t * 0.5 }
  }
  return { intervalMultiplier: 1, toughEnemyBias: 0 }
}

/** Relative danger of each roster entry, used only to reorder a wave's own queue. */
export const ENEMY_DIFFICULTY_RANK: Record<string, number> = {
  walker: 1,
  runner: 1,
  spitter: 2,
  brute: 3,
  exploder: 3,
  stalker: 4,
}

/**
 * Moves the most (bias > 0) or least (bias < 0) dangerous remaining entry in
 * `queue` to the front. Idempotent: once the right entry already leads, it's
 * a no-op, so this is cheap to call every frame without thrashing the order.
 */
export function applyDirectorBias(queue: string[], bias: number): void {
  if (queue.length < 2 || Math.abs(bias) < 0.05) return

  const wantHardest = bias > 0
  let targetIndex = 0
  let targetRank = ENEMY_DIFFICULTY_RANK[queue[0]] ?? 1

  for (let i = 1; i < queue.length; i++) {
    const rank = ENEMY_DIFFICULTY_RANK[queue[i]] ?? 1
    if (wantHardest ? rank > targetRank : rank < targetRank) {
      targetRank = rank
      targetIndex = i
    }
  }

  if (targetIndex === 0) return
  const [entry] = queue.splice(targetIndex, 1)
  queue.unshift(entry)
}
