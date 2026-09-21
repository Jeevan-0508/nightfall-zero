import { GameEngine } from './GameEngine'
import { createEnemy } from '../entities/factories'
import { walker } from '../../content/enemies'
import type { InputState } from './types'

export interface BenchmarkResult {
  ticks: number
  totalMs: number
  avgMsPerTick: number
  estimatedFps: number
}

export interface StressBenchmarkResult {
  enemyCount: number
  ticks: number
  avgMsPerTick: number
  p95MsPerTick: number
  maxMsPerTick: number
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

/**
 * Forces a dense pack of enemies around the player (the scenario a spatial-grid regression would
 * show up in first) and measures per-tick wall-clock time individually, not just the batch average -
 * a P95 gate catches an occasional slow tick that an average can hide. Headless, safe for CI.
 */
export function runStressBenchmark(enemyCount: number, ticks = 180, dt = 1 / 60): StressBenchmarkResult {
  const engine = new GameEngine(90000 + enemyCount, 'assault-rifle', {}, 'onslaught')
  engine.player.health = 1e9
  engine.player.maxHealth = 1e9
  engine.enemyList.length = 0
  for (let i = 0; i < enemyCount; i++) {
    const angle = (i / enemyCount) * Math.PI * 2
    engine.enemyList.push(
      createEnemy(walker, {
        x: engine.player.position.x + Math.cos(angle) * 200,
        y: engine.player.position.y + Math.sin(angle) * 200,
      }),
    )
  }
  const input = benchmarkInput()
  const perTickMs: number[] = []
  for (let i = 0; i < ticks; i++) {
    const start = performance.now()
    engine.update(dt, input)
    perTickMs.push(performance.now() - start)
  }
  perTickMs.sort((a, b) => a - b)
  const totalMs = perTickMs.reduce((sum, ms) => sum + ms, 0)
  const p95Index = Math.min(perTickMs.length - 1, Math.floor(perTickMs.length * 0.95))
  return {
    enemyCount,
    ticks,
    avgMsPerTick: totalMs / ticks,
    p95MsPerTick: perTickMs[p95Index]!,
    maxMsPerTick: perTickMs[perTickMs.length - 1]!,
  }
}
