import type { AbilityDefinition, AbilityState } from '../engine/types'

/** Advances cooldown/active-duration timers. Call once per frame for every ability the player has. */
export function tickAbilityTimers(state: AbilityState, dt: number): void {
  if (state.cooldownRemaining > 0) state.cooldownRemaining = Math.max(0, state.cooldownRemaining - dt)
  if (state.activeRemaining > 0) state.activeRemaining = Math.max(0, state.activeRemaining - dt)
}

/** Puts the ability on cooldown (and starts its active window, if it has one). Returns false if still on cooldown. */
export function tryActivate(state: AbilityState, def: AbilityDefinition): boolean {
  if (state.cooldownRemaining > 0) return false
  state.cooldownRemaining = def.cooldown
  if (def.duration) state.activeRemaining = def.duration
  return true
}
