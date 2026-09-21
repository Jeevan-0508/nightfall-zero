import type { GameEngine } from '../../engine/GameEngine'
import { PLAYER_SPEED } from '../../engine/GameEngine'
import type { Enemy } from '../../engine/types'

/**
 * Upper-body/weapon pose. Deliberately decoupled from leg/breathing animation (driven
 * continuously by `speedRatio` below instead of a discrete state) so a player who fires while
 * moving still gets both cues at once, rather than one state stomping the other.
 */
export type PlayerPose = 'death' | 'hit' | 'reload' | 'shoot' | 'ability' | 'move'

export interface PlayerAnimState {
  pose: PlayerPose
  speedRatio: number // current speed / nominal move speed. 0 = standing still, >1 = buffed/sprinting
  lowHealth: boolean
}

const SHOOT_POSE_RECOIL_THRESHOLD = 1 // engine.recoilAmount above this still reads as "just fired"
const LOW_HEALTH_RATIO = 0.25
const IDLE_SPEED_RATIO = 0.05

export function getPlayerAnimState(engine: GameEngine): PlayerAnimState {
  const { player } = engine
  const healthRatio = player.maxHealth > 0 ? player.health / player.maxHealth : 1
  const speed = Math.hypot(player.velocity.x, player.velocity.y)
  const speedRatio = speed / PLAYER_SPEED
  const equipped = player.weapons[player.equippedWeaponId]
  const abilityActive = Object.values(player.abilities).some((a) => a.activeRemaining > 0)

  let pose: PlayerPose
  if (engine.status === 'dead') pose = 'death'
  else if (engine.playerHitFlash > 0) pose = 'hit'
  else if (equipped?.reloading) pose = 'reload'
  else if (engine.recoilAmount > SHOOT_POSE_RECOIL_THRESHOLD) pose = 'shoot'
  else if (abilityActive) pose = 'ability'
  else pose = 'move'

  return { pose, speedRatio, lowHealth: engine.status !== 'dead' && healthRatio < LOW_HEALTH_RATIO }
}

/** Stride phase for the current frame: frequency scales with speed so a movement-speed buff
 * visibly strides faster, not just covers more ground with identical-looking legs. */
export function walkPhase(t: number, speedRatio: number): number {
  const freq = 6 + Math.min(3, speedRatio) * 2.5
  return t * freq
}

/** 0 when standing still, ramping to 1 by a normal walking pace - used as the stride swing
 * amplitude so idle characters don't jitter their legs. */
export function strideAmplitude(speedRatio: number): number {
  if (speedRatio < IDLE_SPEED_RATIO) return 0
  return Math.min(1, speedRatio / 0.8)
}

/** Slow sinusoidal breathing/idle bob, independent of movement. */
export function breathe(t: number): number {
  return Math.sin(t * 2.2)
}

/** Every enemy's facing + stride state, derived the same way the pre-existing renderer already
 * computed `facing` (velocity when moving, otherwise toward the player) - no new Enemy fields. */
export function getEnemyAnimState(
  enemy: Enemy,
  playerPos: { x: number; y: number },
  t: number,
): { facing: number; speedRatio: number; walkPhase: number; strideAmplitude: number } {
  const speed = Math.hypot(enemy.velocity.x, enemy.velocity.y)
  const toPlayer = Math.atan2(playerPos.y - enemy.position.y, playerPos.x - enemy.position.x)
  const facing = speed > 4 ? Math.atan2(enemy.velocity.y, enemy.velocity.x) : toPlayer
  const speedRatio = speed / 90 // rough normalization: ~90px/s reads as a full walk cycle for most enemy speeds
  return { facing, speedRatio, walkPhase: walkPhase(t, speedRatio), strideAmplitude: strideAmplitude(speedRatio) }
}

/** True in the brief window a Spitter's ranged cooldown is about to expire, i.e. it's about to
 * fire - derived purely from the existing `rangedCooldown` field, no new engine state, so the
 * player learns to read "throat glowing brighter" as "this enemy is about to shoot." */
export function isSpitterTelegraphing(enemy: Enemy, windowSeconds = 0.35): boolean {
  return enemy.rangedCooldown > 0 && enemy.rangedCooldown < windowSeconds
}

/** True near the peak of each stride swing - a stateless, cheap approximation of a footstep
 * impact beat for heavy enemies, with no per-enemy timer bookkeeping required. */
export function isStrideImpactBeat(phase: number, amplitude: number): boolean {
  return amplitude > 0.4 && Math.abs(Math.sin(phase)) > 0.92
}
