import { describe, expect, it } from 'vitest'
import { getVignetteEdgeColor } from '../game/render/renderer'

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
})
