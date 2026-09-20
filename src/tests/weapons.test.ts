import { describe, expect, it } from 'vitest'
import { tickWeaponTimers, tryFire } from '../game/combat/weapons'
import { mulberry32 } from '../game/engine/rng'
import { assaultRifle, shotgun } from '../content/weapons'
import type { WeaponState } from '../game/engine/types'

function freshState(magazineSize: number): WeaponState {
  return { ammoInMag: magazineSize, fireCooldown: 0, reloading: false, reloadRemaining: 0 }
}

describe('tryFire', () => {
  it('fires a projectile and consumes one round from the magazine', () => {
    const state = freshState(assaultRifle.magazineSize)
    const rng = mulberry32(42)
    const result = tryFire({ x: 0, y: 0 }, 0, state, assaultRifle, rng)
    expect(result.fired).toBe(true)
    expect(result.projectiles).toHaveLength(1)
    expect(state.ammoInMag).toBe(assaultRifle.magazineSize - 1)
  })

  it('respects fire rate cooldown between shots', () => {
    const state = freshState(assaultRifle.magazineSize)
    const rng = mulberry32(42)
    tryFire({ x: 0, y: 0 }, 0, state, assaultRifle, rng)
    const second = tryFire({ x: 0, y: 0 }, 0, state, assaultRifle, rng)
    expect(second.fired).toBe(false)
  })

  it('allows firing again once the fire-rate cooldown elapses', () => {
    const state = freshState(assaultRifle.magazineSize)
    const rng = mulberry32(42)
    tryFire({ x: 0, y: 0 }, 0, state, assaultRifle, rng)
    tickWeaponTimers(state, assaultRifle, 1 / assaultRifle.fireRate + 0.001)
    const second = tryFire({ x: 0, y: 0 }, 0, state, assaultRifle, rng)
    expect(second.fired).toBe(true)
  })

  it('auto-reloads once the magazine is emptied and blocks firing while reloading', () => {
    const state = freshState(assaultRifle.magazineSize)
    const rng = mulberry32(7)
    for (let i = 0; i < assaultRifle.magazineSize; i++) {
      tryFire({ x: 0, y: 0 }, 0, state, assaultRifle, rng)
      tickWeaponTimers(state, assaultRifle, 1 / assaultRifle.fireRate + 0.001)
    }
    expect(state.ammoInMag).toBe(0)
    expect(state.reloading).toBe(true)

    const duringReload = tryFire({ x: 0, y: 0 }, 0, state, assaultRifle, rng)
    expect(duringReload.fired).toBe(false)

    tickWeaponTimers(state, assaultRifle, assaultRifle.reloadTime + 0.01)
    expect(state.reloading).toBe(false)
    expect(state.ammoInMag).toBe(assaultRifle.magazineSize)
  })

  it('fires multiple pellets per trigger pull for a shotgun-style weapon', () => {
    const state = freshState(shotgun.magazineSize)
    const rng = mulberry32(3)
    const result = tryFire({ x: 0, y: 0 }, 0, state, shotgun, rng)
    expect(result.fired).toBe(true)
    expect(result.projectiles).toHaveLength(shotgun.pellets)
    expect(state.ammoInMag).toBe(shotgun.magazineSize - 1)
  })
})
