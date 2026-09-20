import type { Rng } from '../engine/rng'
import { rangeFloat } from '../engine/rng'
import type { Projectile, WeaponDefinition, WeaponState } from '../engine/types'
import type { Vector2 } from '../engine/vector'
import { fromAngle } from '../engine/vector'
import { rollWeaponDamage } from './damage'

let projectileIdCounter = 0

export interface FireResult {
  fired: boolean
  projectiles: Projectile[]
}

/** Advances reload/cooldown timers. Call once per frame for the equipped weapon. */
export function tickWeaponTimers(state: WeaponState, weapon: WeaponDefinition, dt: number): void {
  if (state.fireCooldown > 0) state.fireCooldown = Math.max(0, state.fireCooldown - dt)
  if (state.reloading) {
    state.reloadRemaining -= dt
    if (state.reloadRemaining <= 0) {
      state.reloading = false
      state.reloadRemaining = 0
      state.ammoInMag = weapon.magazineSize
    }
  }
}

export function startReload(state: WeaponState, weapon: WeaponDefinition): void {
  if (state.reloading) return
  if (state.ammoInMag >= weapon.magazineSize) return
  state.reloading = true
  state.reloadRemaining = weapon.reloadTime
}

function spawnOneProjectile(
  origin: Vector2,
  aimAngle: number,
  weapon: WeaponDefinition,
  rng: Rng,
): Projectile {
  const angle = aimAngle + rangeFloat(rng, -weapon.spread, weapon.spread)
  const direction = fromAngle(angle)
  const { amount, isCrit } = rollWeaponDamage(weapon, rng)

  projectileIdCounter += 1
  return {
    id: projectileIdCounter,
    position: { x: origin.x, y: origin.y },
    velocity: { x: direction.x * weapon.bulletSpeed, y: direction.y * weapon.bulletSpeed },
    damage: amount,
    isCrit,
    radius: 4,
    distanceRemaining: weapon.range,
    pierceRemaining: weapon.pierceCount ?? 0,
    explosionRadius: weapon.explosionRadius,
  }
}

export function tryFire(
  origin: Vector2,
  aimAngle: number,
  state: WeaponState,
  weapon: WeaponDefinition,
  rng: Rng,
): FireResult {
  if (state.reloading) return { fired: false, projectiles: [] }
  if (state.fireCooldown > 0) return { fired: false, projectiles: [] }
  if (state.ammoInMag <= 0) {
    startReload(state, weapon)
    return { fired: false, projectiles: [] }
  }

  state.ammoInMag -= 1
  state.fireCooldown = 1 / weapon.fireRate
  if (state.ammoInMag === 0) startReload(state, weapon)

  const projectiles: Projectile[] = []
  for (let i = 0; i < weapon.pellets; i++) {
    projectiles.push(spawnOneProjectile(origin, aimAngle, weapon, rng))
  }

  return { fired: true, projectiles }
}

export function resetProjectileIdCounter(): void {
  projectileIdCounter = 0
}
