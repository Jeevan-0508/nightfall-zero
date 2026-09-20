import { describe, expect, it } from 'vitest'
import { applyDamage, rollWeaponDamage } from '../game/combat/damage'
import { mulberry32 } from '../game/engine/rng'
import { assaultRifle } from '../content/weapons'

describe('applyDamage', () => {
  it('reduces health by the given amount', () => {
    const target = { health: 50 }
    const died = applyDamage(target, 20)
    expect(target.health).toBe(30)
    expect(died).toBe(false)
  })

  it('reports death when health drops to zero or below', () => {
    const target = { health: 10 }
    expect(applyDamage(target, 10)).toBe(true)
    expect(applyDamage({ health: 5 }, 20)).toBe(true)
  })
})

describe('rollWeaponDamage', () => {
  it('never crits when criticalChance is 0', () => {
    const rng = mulberry32(1)
    const weapon = { ...assaultRifle, criticalChance: 0 }
    for (let i = 0; i < 50; i++) {
      const roll = rollWeaponDamage(weapon, rng)
      expect(roll.isCrit).toBe(false)
      expect(roll.amount).toBe(weapon.damage)
    }
  })

  it('always crits and multiplies damage when criticalChance is 1', () => {
    const rng = mulberry32(1)
    const weapon = { ...assaultRifle, criticalChance: 1, criticalMultiplier: 3 }
    const roll = rollWeaponDamage(weapon, rng)
    expect(roll.isCrit).toBe(true)
    expect(roll.amount).toBe(weapon.damage * 3)
  })
})
