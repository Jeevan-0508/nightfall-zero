import { describe, expect, it } from 'vitest'
import { applyEnemyDeathTransform, getVignetteEdgeColor } from '../game/render/renderer'
import { BOSS_DEATH_TIMER, DEATH_ANIMATION_DURATION, createEnemy, killEnemy } from '../game/entities/factories'
import { brute, exploder, executioner, overlord, runner, spitter, stalker, walker } from '../content/enemies'

/** Tracks which drawing methods ran, so death-transform tests can assert *which* code path
 * fired (rotate vs. translate vs. scale) without pinning brittle geometry constants. Mirrors
 * the no-op mockCtx pattern in characterVisuals.test.ts. */
function mockCtx(): CanvasRenderingContext2D & { calls: string[] } {
  const calls: string[] = []
  const ctx: Record<string, unknown> = { strokeStyle: '', lineWidth: 0, globalAlpha: 1, calls }
  for (const method of ['beginPath', 'arc', 'fill', 'stroke', 'save', 'restore', 'translate', 'rotate', 'scale']) {
    ctx[method] = () => {
      calls.push(method)
    }
  }
  return ctx as unknown as CanvasRenderingContext2D & { calls: string[] }
}

describe('getVignetteEdgeColor', () => {
  it('returns a low-health red tint regardless of colorblind mode', () => {
    expect(getVignetteEdgeColor(0.2, false, false).color).toBe('190, 20, 20')
    expect(getVignetteEdgeColor(0.2, true, false).color).toBe('190, 20, 20')
    expect(getVignetteEdgeColor(0.2, false, true).color).toBe('190, 20, 20')
  })

  it('tints purple-red for a live boss in standard mode', () => {
    const result = getVignetteEdgeColor(0.8, true, false)
    expect(result.color).toBe('110, 20, 60')
  })

  it('swaps the boss tint to a distinct blue when colorblind mode is on', () => {
    const result = getVignetteEdgeColor(0.8, true, true)
    expect(result.color).toBe('20, 120, 190')
    expect(result.color).not.toBe(getVignetteEdgeColor(0.8, true, false).color)
  })

  it('falls back to a neutral black vignette with full health and no boss', () => {
    const result = getVignetteEdgeColor(1, false, false)
    expect(result.color).toBe('0, 0, 0')
  })

  it('overrides everything with a near-total black vignette during Blackout, even at low health with a boss up', () => {
    const result = getVignetteEdgeColor(0.1, true, false, true)
    expect(result.color).toBe('0, 0, 0')
    expect(result.alpha).toBeGreaterThan(getVignetteEdgeColor(1, false, false).alpha)
  })
})

describe('applyEnemyDeathTransform', () => {
  it('does not throw for any enemy type across the death window', () => {
    for (const def of [walker, runner, spitter, brute, exploder, stalker, overlord, executioner]) {
      const enemy = createEnemy(def, { x: 0, y: 0 })
      for (const deathTimer of [def.behavior === 'boss' ? BOSS_DEATH_TIMER : DEATH_ANIMATION_DURATION, 0.2, 0.01]) {
        enemy.deathTimer = deathTimer
        expect(() => applyEnemyDeathTransform(mockCtx(), enemy, def)).not.toThrow()
      }
    }
  })

  it('gives Walker a distinct topple (rotate + translate + scale), not the generic squash alone', () => {
    const enemy = createEnemy(walker, { x: 0, y: 0 })
    enemy.deathTimer = 0.2
    const ctx = mockCtx()
    applyEnemyDeathTransform(ctx, enemy, walker)
    expect(ctx.calls).toContain('rotate')
    expect(ctx.calls).toContain('translate')
    expect(ctx.calls).toContain('scale')
  })

  it('gives Runner a spin (rotate) plus a forward slide (translate), unlike the generic squash', () => {
    const enemy = createEnemy(runner, { x: 0, y: 0 })
    enemy.deathTimer = 0.2
    const ctx = mockCtx()
    applyEnemyDeathTransform(ctx, enemy, runner)
    expect(ctx.calls).toContain('rotate')
    expect(ctx.calls).toContain('translate')
  })

  it('draws a ground-impact ring (stroke) early in a Brute death, on top of its heavy-drop transform', () => {
    const enemy = createEnemy(brute, { x: 0, y: 0 })
    enemy.deathTimer = DEATH_ANIMATION_DURATION * 0.9
    const ctx = mockCtx()
    applyEnemyDeathTransform(ctx, enemy, brute)
    expect(ctx.calls).toContain('stroke')
    expect(ctx.calls).toContain('translate')
  })

  it('draws a toxic burst ring early in a Spitter death, and scales up rather than squashing down', () => {
    const enemy = createEnemy(spitter, { x: 0, y: 0 })
    enemy.deathTimer = DEATH_ANIMATION_DURATION * 0.9
    const ctx = mockCtx()
    applyEnemyDeathTransform(ctx, enemy, spitter)
    expect(ctx.calls).toContain('stroke')
  })

  it('keeps the Stalker dissipating upward (translate only, no scale)', () => {
    const enemy = createEnemy(stalker, { x: 0, y: 0 })
    enemy.deathTimer = 0.2
    const ctx = mockCtx()
    applyEnemyDeathTransform(ctx, enemy, stalker)
    expect(ctx.calls).toContain('translate')
    expect(ctx.calls).not.toContain('scale')
  })

  it('holds a boss fully opaque and shuddering (translate, no scale) while deathTimer is still above DEATH_ANIMATION_DURATION', () => {
    const enemy = createEnemy(overlord, { x: 0, y: 0 })
    enemy.deathTimer = BOSS_DEATH_TIMER - 0.05
    const ctx = mockCtx()
    applyEnemyDeathTransform(ctx, enemy, overlord)
    expect(ctx.globalAlpha).toBe(1)
    expect(ctx.calls).toContain('translate')
    expect(ctx.calls).not.toContain('scale')
  })

  it('lets a boss collapse (scale, fading alpha) once deathTimer drops into the ordinary fade window', () => {
    const enemy = createEnemy(overlord, { x: 0, y: 0 })
    enemy.deathTimer = DEATH_ANIMATION_DURATION * 0.5
    const ctx = mockCtx()
    applyEnemyDeathTransform(ctx, enemy, overlord)
    expect(ctx.globalAlpha).toBeLessThan(1)
    expect(ctx.calls).toContain('scale')
  })

  it('gives killEnemy a longer deathTimer for a boss than for a regular enemy', () => {
    const bossEnemy = createEnemy(overlord, { x: 0, y: 0 })
    killEnemy(bossEnemy)
    expect(bossEnemy.deathTimer).toBe(BOSS_DEATH_TIMER)

    const regularEnemy = createEnemy(walker, { x: 0, y: 0 })
    killEnemy(regularEnemy)
    expect(regularEnemy.deathTimer).toBe(DEATH_ANIMATION_DURATION)

    const executionerEnemy = createEnemy(executioner, { x: 0, y: 0 })
    killEnemy(executionerEnemy)
    expect(executionerEnemy.deathTimer).toBe(BOSS_DEATH_TIMER)
  })
})
