import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../game/engine/rng'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import { applyStatus } from '../game/combat/statusEffects'
import {
  ELITE_MODIFIERS,
  rollEliteModifier,
  getEliteSpeedMultiplier,
  getArmorMultiplier,
  absorbShield,
  tickEliteRegen,
  tickEliteTeleport,
  FRENZIED_SPEED_MULTIPLIER,
  ARMORED_DAMAGE_MULTIPLIER,
  SHIELD_CAPACITY,
  REGEN_RATE,
  TELEPORT_INTERVAL,
  TELEPORT_WARNING_DURATION,
} from '../game/combat/eliteModifiers'

describe('rollEliteModifier', () => {
  it('always returns one of the six defined modifiers', () => {
    const rng = mulberry32(1)
    for (let i = 0; i < 200; i++) {
      expect(ELITE_MODIFIERS).toContain(rollEliteModifier(rng))
    }
  })

  it('is deterministic for a given seed', () => {
    const a = Array.from({ length: 30 }, () => rollEliteModifier(mulberry32(42)))
    // same seed reused fresh each call -> same first roll every time
    expect(new Set(a).size).toBe(1)

    const rngA = mulberry32(7)
    const rngB = mulberry32(7)
    const seqA = Array.from({ length: 20 }, () => rollEliteModifier(rngA))
    const seqB = Array.from({ length: 20 }, () => rollEliteModifier(rngB))
    expect(seqA).toEqual(seqB)
  })
})

describe('getEliteSpeedMultiplier', () => {
  it('is 1 for a non-frenzied enemy', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'armored')
    expect(getEliteSpeedMultiplier(enemy)).toBe(1)
  })

  it('boosts speed for a frenzied enemy', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'frenzied')
    expect(getEliteSpeedMultiplier(enemy)).toBe(FRENZIED_SPEED_MULTIPLIER)
  })
})

describe('getArmorMultiplier', () => {
  it('reduces non-crit damage on an armored enemy', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'armored')
    expect(getArmorMultiplier(enemy, false)).toBe(ARMORED_DAMAGE_MULTIPLIER)
  })

  it('lets a critical hit fully bypass armor', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'armored')
    expect(getArmorMultiplier(enemy, true)).toBe(1)
  })

  it('is 1 for a non-armored enemy regardless of crit', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'frenzied')
    expect(getArmorMultiplier(enemy, false)).toBe(1)
    expect(getArmorMultiplier(enemy, true)).toBe(1)
  })
})

describe('absorbShield', () => {
  it('absorbs damage into the shield pool before health', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'shielded')
    expect(enemy.shieldRemaining).toBe(SHIELD_CAPACITY)
    const result = absorbShield(enemy, 10)
    expect(result.remainingDamage).toBe(0)
    expect(result.justBroke).toBe(false)
    expect(enemy.shieldRemaining).toBe(SHIELD_CAPACITY - 10)
  })

  it('reports justBroke and passes overflow damage through once the shield is spent', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'shielded')
    const result = absorbShield(enemy, SHIELD_CAPACITY + 15)
    expect(result.remainingDamage).toBe(15)
    expect(result.justBroke).toBe(true)
    expect(enemy.shieldRemaining).toBe(0)
  })

  it('passes all damage through for a non-shielded enemy', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'frenzied')
    const result = absorbShield(enemy, 25)
    expect(result.remainingDamage).toBe(25)
    expect(result.justBroke).toBe(false)
  })
})

describe('tickEliteRegen', () => {
  it('heals a regenerating enemy toward max health over time', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'regenerating')
    enemy.health = enemy.maxHealth - 20
    tickEliteRegen(enemy, 1)
    expect(enemy.health).toBeCloseTo(enemy.maxHealth - 20 + enemy.maxHealth * REGEN_RATE)
  })

  it('never heals past max health', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'regenerating')
    enemy.health = enemy.maxHealth - 0.001
    tickEliteRegen(enemy, 5)
    expect(enemy.health).toBe(enemy.maxHealth)
  })

  it('is suppressed while the enemy is burning (burn build vs Regenerator)', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'regenerating')
    enemy.health = enemy.maxHealth - 20
    applyStatus(enemy, 'burn', 3, 8)
    tickEliteRegen(enemy, 1)
    expect(enemy.health).toBe(enemy.maxHealth - 20)
  })

  it('does nothing for a non-regenerating enemy', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'frenzied')
    enemy.health = enemy.maxHealth - 20
    tickEliteRegen(enemy, 1)
    expect(enemy.health).toBe(enemy.maxHealth - 20)
  })
})

describe('tickEliteTeleport', () => {
  it('flags a warning before firing, then fires exactly once the interval elapses', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'teleporting')
    expect(enemy.teleportTimer).toBe(TELEPORT_INTERVAL)

    const warnAt = TELEPORT_INTERVAL - TELEPORT_WARNING_DURATION + 0.05
    expect(tickEliteTeleport(enemy, warnAt)).toBe(false)
    expect(enemy.teleportWarning).toBe(true)

    expect(tickEliteTeleport(enemy, TELEPORT_INTERVAL)).toBe(true)
    expect(enemy.teleportWarning).toBe(false)
    expect(enemy.teleportTimer).toBe(TELEPORT_INTERVAL)
  })

  it('never fires for a non-teleporting enemy', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 }, true, 'frenzied')
    expect(tickEliteTeleport(enemy, 999)).toBe(false)
  })
})
