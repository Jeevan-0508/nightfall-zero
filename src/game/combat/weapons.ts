import type { Rng } from '../engine/rng'
import { rangeFloat } from '../engine/rng'
import type { Player, Projectile, WeaponDefinition } from '../engine/types'
import { fromAngle } from '../engine/vector'
import { rollWeaponDamage } from './damage'

let projectileIdCounter = 0

export interface FireResult {
  fired: boolean
  projectile?: Projectile
}

/** Advances reload/cooldown timers. Call once per frame regardless of input. */
export function tickWeaponTimers(player: Player, weapon: WeaponDefinition, dt: number): void {
  const w = player.weapon
  if (w.fireCooldown > 0) w.fireCooldown = Math.max(0, w.fireCooldown - dt)
  if (w.reloading) {
    w.reloadRemaining -= dt
    if (w.reloadRemaining <= 0) {
      w.reloading = false
      w.reloadRemaining = 0
      w.ammoInMag = weapon.magazineSize
    }
  }
}

export function startReload(player: Player, weapon: WeaponDefinition): void {
  if (player.weapon.reloading) return
  if (player.weapon.ammoInMag >= weapon.magazineSize) return
  player.weapon.reloading = true
  player.weapon.reloadRemaining = weapon.reloadTime
}

export function tryFire(player: Player, weapon: WeaponDefinition, rng: Rng): FireResult {
  const w = player.weapon
  if (!player.alive) return { fired: false }
  if (w.reloading) return { fired: false }
  if (w.fireCooldown > 0) return { fired: false }
  if (w.ammoInMag <= 0) {
    startReload(player, weapon)
    return { fired: false }
  }

  w.ammoInMag -= 1
  w.fireCooldown = 1 / weapon.fireRate
  if (w.ammoInMag === 0) startReload(player, weapon)

  const spreadAngle = player.rotation + rangeFloat(rng, -weapon.spread, weapon.spread)
  const direction = fromAngle(spreadAngle)
  const { amount, isCrit } = rollWeaponDamage(weapon, rng)

  projectileIdCounter += 1
  const projectile: Projectile = {
    id: projectileIdCounter,
    position: { x: player.position.x, y: player.position.y },
    velocity: { x: direction.x * weapon.bulletSpeed, y: direction.y * weapon.bulletSpeed },
    damage: amount,
    isCrit,
    radius: 4,
    distanceRemaining: weapon.range,
  }

  return { fired: true, projectile }
}

export function resetProjectileIdCounter(): void {
  projectileIdCounter = 0
}
