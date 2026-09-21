import type { Rng } from '../engine/rng'
import { chance, rangeFloat } from '../engine/rng'

/**
 * Rare, bounded mid-run events that briefly change the pace without ever
 * becoming a constant modifier: Blackout is a visibility scare (director
 * doesn't touch numbers), Hunted is a temporary aggression spike (reuses the
 * Director's own bias/interval knobs), Supply Drop is a risk-free reward
 * window. Deliberately just 3 kinds, not a whole event-deck system - the
 * fourth event named in the directive, Overcharge, is the player's existing
 * ability and only needed a HUD call-out wired to its own activation event,
 * not a new mechanic here (see the tracking doc audit).
 */
export type RunEventKind = 'blackout' | 'hunted' | 'supplyDrop'

export interface ActiveRunEvent {
  kind: RunEventKind
  remaining: number
  totalDuration: number
}

export interface RunEventState {
  active: ActiveRunEvent | null
  cooldownRemaining: number
}

const EVENT_DURATIONS: Record<RunEventKind, number> = {
  blackout: 9,
  hunted: 10,
  supplyDrop: 14,
}

const EVENT_KINDS: RunEventKind[] = ['blackout', 'hunted', 'supplyDrop']

const MIN_WAVE_FOR_EVENTS = 3
const EVENT_CHANCE_PER_ELIGIBLE_WAVE = 0.35
const COOLDOWN_AFTER_EVENT = 20 // seconds - keeps events rare and spaced out, never back-to-back

export function createRunEventState(): RunEventState {
  return { active: null, cooldownRemaining: 0 }
}

export function tickRunEvent(state: RunEventState, dt: number): void {
  if (state.cooldownRemaining > 0) state.cooldownRemaining = Math.max(0, state.cooldownRemaining - dt)
  if (state.active) {
    state.active.remaining -= dt
    if (state.active.remaining <= 0) state.active = null
  }
}

/** Ends the active event immediately (used when Supply Drop is collected early - no reason to
 * let its clock run out once the reward has already been claimed). */
export function endActiveRunEvent(state: RunEventState): void {
  state.active = null
}

/**
 * Rolled once per wave start. Never before wave 3, never while one is already
 * active or still on cooldown, and even then only a 35% chance - this is a
 * rare occurrence layered on top of normal waves, not a constant modifier.
 */
export function maybeStartRunEvent(state: RunEventState, waveIndex: number, rng: Rng): RunEventKind | null {
  if (state.active || state.cooldownRemaining > 0) return null
  if (waveIndex < MIN_WAVE_FOR_EVENTS) return null
  if (!chance(rng, EVENT_CHANCE_PER_ELIGIBLE_WAVE)) return null

  const kind = EVENT_KINDS[Math.floor(rangeFloat(rng, 0, EVENT_KINDS.length))]
  state.active = { kind, remaining: EVENT_DURATIONS[kind], totalDuration: EVENT_DURATIONS[kind] }
  state.cooldownRemaining = COOLDOWN_AFTER_EVENT
  return kind
}

export function isRunEventActive(state: RunEventState, kind: RunEventKind): boolean {
  return state.active?.kind === kind
}
