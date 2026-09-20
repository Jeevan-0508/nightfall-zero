import { GameEngine } from './GameEngine'
import type { InputState } from './types'

export interface BenchmarkResult {
  ticks: number
  totalMs: number
  avgMsPerTick: number
  estimatedFps: number
}

function benchmarkInput(): InputState {
  return {
    up: true,
    down: false,
    left: false,
    right: true,
    aimX: 400,
    aimY: 300,
    firing: true,
    switchTo: null,
    abilityTrigger: null,
  }
}

/**
 * Runs a fixed batch of GameEngine.update() ticks against the "onslaught" mode
 * (the busiest spawn preset) and measures wall-clock time per tick. Headless:
 * no canvas/DOM involved, safe to run in CI on every push.
 */
export function runBenchmark(ticks = 600, dt = 1 / 60): BenchmarkResult {
  const engine = new GameEngine(12345, 'assault-rifle', {}, 'onslaught')
  const input = benchmarkInput()
  const start = performance.now()
  for (let i = 0; i < ticks; i++) {
    engine.update(dt, input)
  }
  const totalMs = performance.now() - start
  const avgMsPerTick = totalMs / ticks
  return {
    ticks,
    totalMs,
    avgMsPerTick,
    estimatedFps: avgMsPerTick > 0 ? 1000 / avgMsPerTick : Infinity,
  }
}
