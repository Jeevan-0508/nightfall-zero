import { describe, expect, it } from 'vitest'
import { runBenchmark } from '../game/engine/benchmark'

describe('performance benchmark', () => {
  it('runs a fixed batch of simulated ticks and reports timing stats', () => {
    const result = runBenchmark(60)
    expect(result.ticks).toBe(60)
    expect(result.totalMs).toBeGreaterThanOrEqual(0)
    expect(result.avgMsPerTick).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(result.avgMsPerTick) || result.estimatedFps === Infinity).toBe(true)
  })

  it('stays within a 60fps-equivalent frame budget under a busy spawn preset', () => {
    const result = runBenchmark(300)
    // Regression gate, not a hard real-time guarantee: CI hardware varies, but a
    // single simulated tick creeping past 16ms (60fps budget) signals a real slowdown.
    expect(result.avgMsPerTick).toBeLessThan(16)
  })

  it('is deterministic in tick count regardless of requested batch size', () => {
    const small = runBenchmark(10)
    const large = runBenchmark(500)
    expect(small.ticks).toBe(10)
    expect(large.ticks).toBe(500)
  })
})
