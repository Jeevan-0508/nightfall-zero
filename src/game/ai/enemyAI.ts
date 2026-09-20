import type { Enemy, EnemyDefinition, Obstacle, Player } from '../engine/types'
import { normalize, subtract, scale, distance } from '../engine/vector'
import { resolveObstacleCollisions } from '../collision/collision'

function computeSeparation(enemy: Enemy, def: EnemyDefinition, others: Enemy[]) {
  let separation = { x: 0, y: 0 }
  for (const other of others) {
    if (other.id === enemy.id || !other.alive) continue
    const d = distance(enemy.position, other.position)
    const combinedRadius = def.radius + 12
    if (d > 0 && d < combinedRadius) {
      const push = normalize(subtract(enemy.position, other.position))
      separation = { x: separation.x + push.x, y: separation.y + push.y }
    }
  }
  return separation
}

function stepPosition(
  enemy: Enemy,
  def: EnemyDefinition,
  dir: { x: number; y: number },
  speed: number,
  dt: number,
  obstacles: Obstacle[],
): void {
  enemy.velocity = scale(dir, speed)
  const moved = {
    x: enemy.position.x + enemy.velocity.x * dt,
    y: enemy.position.y + enemy.velocity.y * dt,
  }
  enemy.position = resolveObstacleCollisions(moved, def.radius, obstacles)
}

/** Direct pursuit + separation, so packs don't fully stack (Walker/Runner/Brute/Exploder). */
function updateMeleeMovement(
  enemy: Enemy,
  def: EnemyDefinition,
  player: Player,
  others: Enemy[],
  dt: number,
  obstacles: Obstacle[],
): void {
  const toPlayer = subtract(player.position, enemy.position)
  const distToPlayer = distance(enemy.position, player.position)
  const minDistance = enemy.attackCooldown > 0 ? 0 : def.radius + player.radius - 2

  let moveDir = { x: 0, y: 0 }
  if (distToPlayer > minDistance) {
    moveDir = normalize(toPlayer)
  }

  const separation = computeSeparation(enemy, def, others)
  const combined = normalize({
    x: moveDir.x + separation.x * 0.6,
    y: moveDir.y + separation.y * 0.6,
  })

  stepPosition(enemy, def, combined, def.speed, dt, obstacles)
}

/** Holds a preferred range, backing off if the player closes in, so it can keep spitting (Spitter). */
function updateRangedMovement(
  enemy: Enemy,
  def: EnemyDefinition,
  player: Player,
  others: Enemy[],
  dt: number,
  obstacles: Obstacle[],
): void {
  const toPlayer = subtract(player.position, enemy.position)
  const distToPlayer = distance(enemy.position, player.position)
  const preferred = def.preferredRange ?? 250
  const buffer = 30

  let moveDir = { x: 0, y: 0 }
  if (distToPlayer < preferred - buffer) {
    moveDir = normalize(scale(toPlayer, -1))
  } else if (distToPlayer > preferred + buffer) {
    moveDir = normalize(toPlayer)
  } else {
    // in the sweet spot: strafe sideways rather than standing still
    moveDir = normalize({ x: -toPlayer.y, y: toPlayer.x })
  }

  const separation = computeSeparation(enemy, def, others)
  const combined = normalize({
    x: moveDir.x + separation.x * 0.6,
    y: moveDir.y + separation.y * 0.6,
  })

  stepPosition(enemy, def, combined, def.speed, dt, obstacles)
}

/**
 * Alternates between a visible approach (normal speed, targetable) and a
 * cloaked dash straight at the player (fast, immune to gunfire). The engine
 * flips `enemy.cloaked` when `phaseTimer` runs out; this function just moves
 * according to whichever phase is currently active.
 */
function updateStalkerMovement(
  enemy: Enemy,
  def: EnemyDefinition,
  player: Player,
  others: Enemy[],
  dt: number,
  obstacles: Obstacle[],
): void {
  const toPlayer = subtract(player.position, enemy.position)
  const distToPlayer = distance(enemy.position, player.position)
  const minDistance = enemy.attackCooldown > 0 ? 0 : def.radius + player.radius - 2

  if (enemy.cloaked) {
    const moveDir = distToPlayer > minDistance ? normalize(toPlayer) : { x: 0, y: 0 }
    stepPosition(enemy, def, moveDir, def.speed * (def.cloakSpeedMultiplier ?? 2.5), dt, obstacles)
    return
  }

  let moveDir = { x: 0, y: 0 }
  if (distToPlayer > minDistance) {
    moveDir = normalize(toPlayer)
  }
  const separation = computeSeparation(enemy, def, others)
  const combined = normalize({
    x: moveDir.x + separation.x * 0.6,
    y: moveDir.y + separation.y * 0.6,
  })
  stepPosition(enemy, def, combined, def.speed, dt, obstacles)
}

export function updateEnemyMovement(
  enemy: Enemy,
  def: EnemyDefinition,
  player: Player,
  others: Enemy[],
  dt: number,
  obstacles: Obstacle[],
): void {
  if (def.behavior === 'ranged') {
    updateRangedMovement(enemy, def, player, others, dt, obstacles)
  } else if (def.behavior === 'stalker') {
    updateStalkerMovement(enemy, def, player, others, dt, obstacles)
  } else {
    updateMeleeMovement(enemy, def, player, others, dt, obstacles)
  }

  if (enemy.attackCooldown > 0) {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt)
  }
  if (enemy.rangedCooldown > 0) {
    enemy.rangedCooldown = Math.max(0, enemy.rangedCooldown - dt)
  }
  if (enemy.hitFlash > 0) {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt)
  }

  if (def.behavior === 'stalker') {
    enemy.phaseTimer -= dt
    if (enemy.phaseTimer <= 0) {
      enemy.cloaked = !enemy.cloaked
      enemy.phaseTimer = enemy.cloaked ? (def.cloakDuration ?? 1) : (def.visibleDuration ?? 2.2)
    }
  }
}
