import { describe, expect, it } from 'vitest'
import { MUZZLE_OFFSET } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { walker, runner, spitter, brute, exploder, stalker, overlord } from '../content/enemies'
import { defaultHumanoidSpec, drawHumanoid } from '../game/render/characters/composer'
import { drawEnemyCharacter, type EnemyAnimInputs } from '../game/render/characters/enemyCharacters'
import { getWeaponVisual, drawWeapon } from '../game/render/weapons/weaponVisuals'
import { weaponOrder } from '../content/weapons'

/** A no-op stand-in for CanvasRenderingContext2D covering every call the character/weapon
 * renderers make. happy-dom's canvas returns a null 2d context, so real drawing can't be
 * exercised here - this lets the *behavior contract* (does it throw, what does it return,
 * where does it put things) be tested without pulling in a native canvas dependency. */
function mockCtx(): CanvasRenderingContext2D {
  const ctx: Record<string, unknown> = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, lineCap: 'round', globalAlpha: 1,
    shadowBlur: 0, shadowColor: '',
  }
  for (const method of ['beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'roundRect', 'fill', 'stroke', 'save', 'restore', 'translate', 'rotate', 'scale']) {
    ctx[method] = () => undefined
  }
  return ctx as unknown as CanvasRenderingContext2D
}

const idleAnim: EnemyAnimInputs = { t: 0, walkPhase: 0, strideAmplitude: 0, speedRatio: 0 }

describe('muzzle offset contract', () => {
  it('is the single source of truth both GameEngine and the weapon renderer anchor to', () => {
    expect(MUZZLE_OFFSET).toBe(6)
  })

  it('drawWeapon does not throw when anchored at radius + MUZZLE_OFFSET for every weapon', () => {
    for (const weapon of weaponOrder) {
      expect(() => drawWeapon(mockCtx(), weapon.id, 16 + MUZZLE_OFFSET, 0)).not.toThrow()
    }
  })
})

describe('getWeaponVisual', () => {
  it('gives every weapon a distinct barrel length, so silhouettes do not collapse to one shape', () => {
    const lengths = weaponOrder.map((w) => getWeaponVisual(w.id).barrelLength)
    expect(new Set(lengths).size).toBe(lengths.length)
  })

  it('falls back to the pistol visual for an unknown weapon id', () => {
    expect(getWeaponVisual('does-not-exist')).toEqual(getWeaponVisual('pistol'))
  })
})

describe('drawHumanoid head anchor contract', () => {
  it('places the head ahead of the torso center along facing (+x), scaled by headForward/headScale', () => {
    const spec = defaultHumanoidSpec(16, '#456')
    spec.headForward = 0.5
    spec.headScale = 0.4
    const { head } = drawHumanoid(mockCtx(), spec, '#123')
    expect(head.x).toBeCloseTo(16 * 0.5, 5)
    expect(head.y).toBeCloseTo(0, 5)
    expect(head.r).toBeCloseTo(16 * 0.4, 5)
  })
})

describe('drawEnemyCharacter dispatch', () => {
  const cases: Array<[string, ReturnType<typeof createEnemy>, typeof walker]> = [
    ['walker', createEnemy(walker, { x: 0, y: 0 }), walker],
    ['runner', createEnemy(runner, { x: 0, y: 0 }), runner],
    ['spitter', createEnemy(spitter, { x: 0, y: 0 }), spitter],
    ['brute', createEnemy(brute, { x: 0, y: 0 }), brute],
    ['stalker', createEnemy(stalker, { x: 0, y: 0 }), stalker],
    ['overlord (boss)', createEnemy(overlord, { x: 0, y: 0 }), overlord],
  ]

  it.each(cases)('draws %s without throwing and returns a head anchor', (_name, enemy, def) => {
    const result = drawEnemyCharacter(mockCtx(), enemy, def, '#789', idleAnim)
    expect(result).not.toBeNull()
    expect(result!.head.r).toBeGreaterThan(0)
  })

  it('the headless Exploder draws without throwing and returns null (no eyes to anchor)', () => {
    const enemy = createEnemy(exploder, { x: 0, y: 0 })
    const result = drawEnemyCharacter(mockCtx(), enemy, exploder, '#789', idleAnim)
    expect(result).toBeNull()
  })

  it('escalates the boss weak-point count with bossStage: hunt < control < enraged', () => {
    const seen: number[] = []
    for (const stage of ['hunt', 'control', 'enraged'] as const) {
      const enemy = createEnemy(overlord, { x: 0, y: 0 })
      enemy.bossStage = stage
      let calls = 0
      const ctx = mockCtx()
      const spy = { ...ctx, arc: () => { calls += 1 } } as unknown as CanvasRenderingContext2D
      drawEnemyCharacter(spy, enemy, overlord, '#789', idleAnim)
      seen.push(calls)
    }
    expect(seen[0]).toBeLessThan(seen[1])
    expect(seen[1]).toBeLessThan(seen[2])
  })
})
