import { clamp } from '../engine/vector'
import type { PlayerProfile, WeaponProfile } from './telemetry'

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
export function applyDirectorBias(queue: string[], bias: number, rankMap: Record<string, number> = ENEMY_DIFFICULTY_RANK): void {
  if (queue.length < 2 || Math.abs(bias) < 0.05) return

  const wantHardest = bias > 0
  let targetIndex = 0
  let targetRank = rankMap[queue[0]] ?? 1

  for (let i = 1; i < queue.length; i++) {
    const rank = rankMap[queue[i]] ?? 1
    if (wantHardest ? rank > targetRank : rank < targetRank) {
      targetRank = rank
      targetIndex = i
    }
  }

  if (targetIndex === 0) return
  const [entry] = queue.splice(targetIndex, 1)
  queue.unshift(entry)
}

/**
 * Which roster entry best punishes each detected playstyle, ranked on the
 * same 1..4 scale as ENEMY_DIFFICULTY_RANK purely so applyDirectorBias can
 * reuse its front-pull logic. This is deliberate counter-design, not
 * difficulty scaling: a kiter sees more of what catches up to them
 * (runner) or out-ranges them (spitter); a camper sees the AOE rusher
 * (exploder) and the ambusher that punishes standing still (stalker); an
 * edge-hugger sees the enemies that close distance fastest or flank from
 * behind (stalker, runner); a brawler already gets full value out of
 * melee, so they see more ranged pressure (spitter) and raw health checks
 * (brute) instead of easier kills.
 */
export const PROFILE_COUNTER_RANK: Record<PlayerProfile, Record<string, number>> = {
  balanced: {},
  kiter: { runner: 4, spitter: 3, exploder: 2, stalker: 2, walker: 1, brute: 1 },
  camper: { exploder: 4, stalker: 3, spitter: 2, walker: 1, runner: 1, brute: 1 },
  edgeHugger: { stalker: 4, runner: 3, exploder: 2, spitter: 1, walker: 1, brute: 1 },
  brawler: { spitter: 4, brute: 3, stalker: 2, walker: 1, runner: 1, exploder: 1 },
}

/**
 * Pulls the roster entry that best counters the detected profile to the
 * front of the wave's own spawn queue. A no-op for 'balanced' (nothing to
 * counter) and for any queue where the counter entry isn't present.
 */
export function applyProfileCounter(queue: string[], profile: PlayerProfile): void {
  const rankMap = PROFILE_COUNTER_RANK[profile]
  if (!rankMap || Object.keys(rankMap).length === 0) return
  applyDirectorBias(queue, 1, rankMap)
}

/**
 * Which roster entry best punishes leaning on one weapon archetype, same
 * counter-design intent as PROFILE_COUNTER_RANK but keyed off Director 3.0's
 * weapon-usage signal instead of movement telemetry. A sniper main out-ranges
 * everything but folds once something closes distance fast, so it sees more
 * runners; a flamethrower main dominates up close but has no answer for
 * pressure from outside its short range, so it sees more spitters; a rocket
 * main deletes single targets but reloads slowly against numbers, so it sees
 * more runners too; an energy main punches through lines of enemies but not
 * one that ambushes from an angle it isn't holding, so it sees more stalkers.
 */
export const WEAPON_PROFILE_COUNTER_RANK: Record<WeaponProfile, Record<string, number>> = {
  balanced: {},
  sniper: { runner: 4, stalker: 2, spitter: 1, walker: 1, brute: 1, exploder: 1 },
  flamethrower: { spitter: 4, runner: 2, walker: 1, brute: 1, stalker: 1, exploder: 1 },
  explosive: { runner: 4, spitter: 2, walker: 1, brute: 1, stalker: 1, exploder: 1 },
  energy: { stalker: 4, exploder: 2, walker: 1, brute: 1, runner: 1, spitter: 1 },
}

/**
 * Pulls the roster entry that best counters the detected weapon profile to
 * the front of the wave's own spawn queue. A no-op for 'balanced' and for
 * any queue where the counter entry isn't present, mirroring
 * applyProfileCounter exactly.
 */
export function applyWeaponProfileCounter(queue: string[], profile: WeaponProfile): void {
  const rankMap = WEAPON_PROFILE_COUNTER_RANK[profile]
  if (!rankMap || Object.keys(rankMap).length === 0) return
  applyDirectorBias(queue, 1, rankMap)
}
