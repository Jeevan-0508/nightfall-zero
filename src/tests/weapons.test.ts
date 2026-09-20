import { describe, expect, it } from 'vitest'
import { tickWeaponTimers, tryFire } from '../game/combat/weapons'
import { createPlayer } from '../game/entities/factories'
import { mulberry32 } from '../game/engine/rng'
import { assaultRifle } from '../content/weapons'

describe('tryFire', () => {
  it('fires a projectile and consumes one round from the magazine', () => {
    const player = createPlayer({ x: 0, y: 0 }, assaultRifle)
    const rng = mulberry32(42)
    const result = tryFire(player, assaultRifle, rng)
    expect(result.fired).toBe(true)
    expect(player.weapon.ammoInMag).toBe(assaultRifle.magazineSize - 1)
  })

  it('respects fire rate cooldown between shots', () => {
    const player = createPlayer({ x: 0, y: 0 }, assaultRifle)
    const rng = mulberry32(42)
    tryFire(player, assaultRifle, rng)
    const second = tryFire(player, assaultRifle, rng)
    expect(second.fired).toBe(false)
  })

  it('allows firing again once the fire-rate cooldown elapses', () => {
    const player = createPlayer({ x: 0, y: 0 }, assaultRifle)
    const rng = mulberry32(42)
    tryFire(player, assaultRifle, rng)
    tickWeaponTimers(player, assaultRifle, 1 / assaultRifle.fireRate + 0.001)
    const second = tryFire(player, assaultRifle, rng)
    expect(second.fired).toBe(true)
  })

  it('auto-reloads once the magazine is emptied and blocks firing while reloading', () => {
    const player = createPlayer({ x: 0, y: 0 }, assaultRifle)
    const rng = mulberry32(7)
    for (let i = 0; i < assaultRifle.magazineSize; i++) {
      tryFire(player, assaultRifle, rng)
      tickWeaponTimers(player, assaultRifle, 1 / assaultRifle.fireRate + 0.001)
    }
    expect(player.weapon.ammoInMag).toBe(0)
    expect(player.weapon.reloading).toBe(true)

    const duringReload = tryFire(player, assaultRifle, rng)
    expect(duringReload.fired).toBe(false)

    tickWeaponTimers(player, assaultRifle, assaultRifle.reloadTime + 0.01)
    expect(player.weapon.reloading).toBe(false)
    expect(player.weapon.ammoInMag).toBe(assaultRifle.magazineSize)
  })
})
