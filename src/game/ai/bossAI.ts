import type { BossAttackId, Enemy, EnemyDefinition, Player } from '../engine/types'
import { normalize, subtract, scale, distance } from '../engine/vector'

const BOSS_ATTACK_ORDER: BossAttackId[] = ['slam', 'charge', 'barrage']

export interface BossUpdateResult {
  /** Non-null exactly on the single frame an attack fires; the caller resolves its damage/projectiles once. */
  resolveAttack: BossAttackId | null
}

/**
 * Bosses cycle idle -> telegraph -> attack -> idle, picking the next attack in a
 * fixed rotation so every fight reads the same way. Movement: chases normally
 * while idle, holds still while telegraphing (so the telegraph is readable), and
 * during a 'charge' attack moves in the direction locked in when the telegraph
 * ended (a committed dash, not a homing missile).
 */
export function updateBoss(enemy: Enemy, def: EnemyDefinition, player: Player, dt: number): BossUpdateResult {
  const result: BossUpdateResult = { resolveAttack: null }
  enemy.bossTimer -= dt

  if (enemy.bossPhase === 'idle') {
    const toPlayer = subtract(player.position, enemy.position)
    const dist = distance(enemy.position, player.position)
    const minDistance = def.radius + player.radius + 20
    const moveDir = dist > minDistance ? normalize(toPlayer) : { x: 0, y: 0 }
    enemy.velocity = scale(moveDir, def.speed)
    enemy.position = { x: enemy.position.x + enemy.velocity.x * dt, y: enemy.position.y + enemy.velocity.y * dt }

    if (enemy.bossTimer <= 0) {
      const lastIndex = enemy.bossAttackId ? BOSS_ATTACK_ORDER.indexOf(enemy.bossAttackId) : BOSS_ATTACK_ORDER.length - 1
      enemy.bossAttackId = BOSS_ATTACK_ORDER[(lastIndex + 1) % BOSS_ATTACK_ORDER.length]
      enemy.bossPhase = 'telegraph'
      enemy.bossTimer = def.bossTelegraphDuration ?? 0.6
      enemy.velocity = { x: 0, y: 0 }
    }
    return result
  }

  if (enemy.bossPhase === 'telegraph') {
    enemy.velocity = { x: 0, y: 0 }
    if (enemy.bossTimer <= 0) {
      enemy.bossPhase = 'attack'
      if (enemy.bossAttackId === 'charge') {
        enemy.bossLockedDir = normalize(subtract(player.position, enemy.position))
        enemy.bossTimer = def.bossChargeDuration ?? 0.45
      } else {
        enemy.bossTimer = 0.15
      }
      result.resolveAttack = enemy.bossAttackId
    }
    return result
  }

  // attack phase
  if (enemy.bossAttackId === 'charge') {
    const dir = enemy.bossLockedDir
    enemy.velocity = scale(dir, def.speed * (def.bossChargeSpeedMultiplier ?? 3))
    enemy.position = { x: enemy.position.x + enemy.velocity.x * dt, y: enemy.position.y + enemy.velocity.y * dt }
  }

  if (enemy.bossTimer <= 0) {
    enemy.bossPhase = 'idle'
    enemy.bossTimer = def.bossAttackInterval ?? 3.5
    enemy.velocity = { x: 0, y: 0 }
  }
  return result
}
