import type { Enemy, EnemyDefinition, Particle } from '../engine/types'
import type { Vector2 } from '../engine/vector'
import { distance } from '../engine/vector'
import { applyDamage } from './damage'
import type { Rng } from '../engine/rng'
import { spawnDeathBurst, spawnExplosion, spawnImpact } from '../engine/particles'

export interface ExplosionResult {
  enemiesHit: Enemy[]
  enemiesKilled: Enemy[]
}

/**
 * Deals flat area damage to every living enemy within `radius` of `center`,
 * excluding `excludeId` (the enemy that already took a direct hit, if any).
 */
export function resolveExplosion(
  center: Vector2,
  radius: number,
  damage: number,
  enemyList: Enemy[],
  enemyDefs: Record<string, EnemyDefinition>,
  particles: Particle[],
  rng: Rng,
  excludeId?: number,
): ExplosionResult {
  spawnExplosion(particles, center, radius)

  const enemiesHit: Enemy[] = []
  const enemiesKilled: Enemy[] = []

  for (const enemy of enemyList) {
    if (!enemy.alive || enemy.id === excludeId) continue
    if (distance(enemy.position, center) > radius) continue

    const def = enemyDefs[enemy.defId]
    if (!def) continue

    enemiesHit.push(enemy)
    spawnImpact(particles, rng, enemy.position, 3)
    const died = applyDamage(enemy, damage)
    if (died) {
      enemy.alive = false
      spawnDeathBurst(particles, rng, enemy.position, def.color)
      enemiesKilled.push(enemy)
    }
  }

  return { enemiesHit, enemiesKilled }
}
