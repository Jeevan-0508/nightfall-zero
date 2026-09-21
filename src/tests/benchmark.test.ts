import { describe, expect, it } from 'vitest'
import { runBenchmark, runStressBenchmark } from '../game/engine/benchmark'

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

describe('stress benchmark (forced high enemy density)', () => {
  // Gates are set with generous margin above measured local numbers (avg ~0.2-0.5ms, P95
  // ~0.3-0.8ms, max spikes ~2.5-4.6ms across 50-200 enemies) so CI hardware variance doesn't
  // cause flakes - the point is catching a return to O(n^2)/O(n*m) scaling, not chasing a
  // specific frame time. Before the spatial-grid fix this scenario scaled quadratically with
  // enemy count; these gates would have failed well before reaching 200.
  for (const enemyCount of [50, 100, 150, 200]) {
    it(`stays within frame budget with ${enemyCount} enemies packed around the player`, () => {
      const result = runStressBenchmark(enemyCount, 180)
      expect(result.enemyCount).toBe(enemyCount)
      expect(result.avgMsPerTick).toBeLessThan(4)
      expect(result.p95MsPerTick).toBeLessThan(8)
      // max is a catastrophic-hang backstop, not a per-tick budget: a shared test worker can take
      // an occasional GC/JIT pause on an otherwise-healthy tick, and P95 above already guards the
      // steady-state budget. This only fires on a true structural blowup (e.g. an O(n^2) return).
      expect(result.maxMsPerTick).toBeLessThan(100)
    })
  }

  it('does not scale per-enemy cost superlinearly as density increases', () => {
    // A regression to O(n^2) separation or O(n*m) projectile scanning would blow this ratio up;
    // a spatial-grid-backed implementation stays roughly flat.
    const low = runStressBenchmark(50, 120)
    const high = runStressBenchmark(200, 120)
    const lowPerEnemy = low.avgMsPerTick / low.enemyCount
    const highPerEnemy = high.avgMsPerTick / high.enemyCount
    expect(highPerEnemy).toBeLessThan(lowPerEnemy * 4)
  })
})
