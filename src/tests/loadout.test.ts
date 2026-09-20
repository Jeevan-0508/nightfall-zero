import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { assaultRifle, shotgun, sniper } from '../content/weapons'

describe('GameEngine starting loadout', () => {
  it('defaults to the assault rifle when no loadout is given', () => {
    const engine = new GameEngine(1)
    expect(engine.player.equippedWeaponId).toBe(assaultRifle.id)
    expect(engine.weaponDef.id).toBe(assaultRifle.id)
  })

  it('equips the chosen starting weapon', () => {
    const engine = new GameEngine(1, shotgun.id)
    expect(engine.player.equippedWeaponId).toBe(shotgun.id)
    expect(engine.weaponDef.id).toBe(shotgun.id)
    expect(engine.getHudSnapshot().weaponName).toBe(shotgun.name)
  })

  it('still carries every other weapon after picking a starting one', () => {
    const engine = new GameEngine(1, sniper.id)
    expect(Object.keys(engine.player.weapons)).toContain(shotgun.id)
    expect(Object.keys(engine.player.weapons)).toContain(assaultRifle.id)
  })

  it('falls back to the assault rifle for an unknown weapon id', () => {
    const engine = new GameEngine(1, 'not-a-real-weapon')
    expect(engine.player.equippedWeaponId).toBe(assaultRifle.id)
  })
})
