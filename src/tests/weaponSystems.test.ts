import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { brute, walker } from '../content/enemies'
import type { InputState } from '../game/engine/types'
import { pistol, rocketLauncher, energyWeapon, assaultRifle } from '../content/weapons'

const assaultRifleMagazineSize = assaultRifle.magazineSize

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    aimX: 0,
    aimY: 0,
    firing: false,
    switchTo: null,
    abilityTrigger: null,
    ...overrides,
  }
}

describe('weapon switching', () => {
  it('switches equipped weapon and tracks ammo independently per weapon', () => {
    const engine = new GameEngine(20)
    engine.update(1 / 60, idleInput({ switchTo: pistol.id }))
    expect(engine.weaponDef.id).toBe(pistol.id)

    engine.update(1 / 60, idleInput({ firing: true }))
    const pistolAmmoAfterShot = engine.player.weapons[pistol.id].ammoInMag
    expect(pistolAmmoAfterShot).toBe(pistol.magazineSize - 1)

    engine.update(1 / 60, idleInput({ switchTo: 'assault-rifle' }))
    expect(engine.weaponDef.id).toBe('assault-rifle')
    expect(engine.player.weapons['assault-rifle'].ammoInMag).toBe(assaultRifleMagazineSize)
    expect(engine.player.weapons[pistol.id].ammoInMag).toBe(pistolAmmoAfterShot)

    engine.update(1 / 60, idleInput({ firing: true }))
    expect(engine.player.weapons[pistol.id].ammoInMag).toBe(pistolAmmoAfterShot)
  })

  it('ignores switching to an unknown weapon id', () => {
    const engine = new GameEngine(21)
    const before = engine.weaponDef.id
    engine.update(1 / 60, idleInput({ switchTo: 'not-a-real-weapon' }))
    expect(engine.weaponDef.id).toBe(before)
  })
})

describe('piercing projectiles (energy weapon)', () => {
  it('survives its first hit and can damage a second enemy behind it', () => {
    const engine = new GameEngine(22)
    engine.update(1 / 60, idleInput({ switchTo: energyWeapon.id }))
    engine.player.position = { x: 100, y: 100 }

    const front = createEnemy(walker, { x: 200, y: 100 })
    const back = createEnemy(walker, { x: 260, y: 100 })
    engine.enemyList.push(front, back)

    const input = idleInput({ aimX: 400, aimY: 100, firing: true })
    for (let i = 0; i < 120 && back.alive; i++) {
      engine.update(1 / 60, input)
    }

    expect(front.alive).toBe(false)
    expect(back.alive).toBe(false)
  })
})

describe('explosive projectiles (rocket launcher)', () => {
  it('damages nearby enemies in a splash radius, not just the direct hit', () => {
    const engine = new GameEngine(23)
    engine.update(1 / 60, idleInput({ switchTo: rocketLauncher.id }))
    engine.player.position = { x: 100, y: 100 }

    const target = createEnemy(brute, { x: 300, y: 100 })
    const bystander = createEnemy(walker, { x: 330, y: 130 })
    engine.enemyList.push(target, bystander)
    const bystanderStartHealth = bystander.health

    const input = idleInput({ aimX: 300, aimY: 100, firing: true })
    for (let i = 0; i < 180 && bystander.health === bystanderStartHealth; i++) {
      engine.update(1 / 60, input)
    }

    expect(bystander.health).toBeLessThan(bystanderStartHealth)
  })
})
