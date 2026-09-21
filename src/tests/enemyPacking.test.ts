import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import { distance } from '../game/engine/vector'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

/** Packs `count` walkers into a tight cluster around the player and lets them all path in at once -
 * the scenario where an O(n^2) or broken separation would show up first as a "blob". */
function packEnemies(engine: GameEngine, count: number): void {
  engine.enemyList.length = 0
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const enemy = createEnemy(walker, {
      x: engine.player.position.x + Math.cos(angle) * 60,
      y: engine.player.position.y + Math.sin(angle) * 60,
    })
    engine.player.health = 1e9 // isolate packing behavior from contact damage ending the run
    engine.enemyList.push(enemy)
  }
}

describe('enemy packing stability', () => {
  for (const count of [10, 25, 50, 100, 150]) {
    it(`keeps ${count} enemies spaced apart (no full overlap/blob) after settling`, () => {
      const engine = new GameEngine(500 + count)
      packEnemies(engine, count)

      for (let i = 0; i < 240; i++) engine.update(1 / 60, idleInput())

      const alive = engine.enemyList.filter((e) => e.alive)
      expect(alive.length).toBeGreaterThan(0)
      for (const enemy of alive) {
        expect(Number.isFinite(enemy.position.x)).toBe(true)
        expect(Number.isFinite(enemy.position.y)).toBe(true)
      }

      // Separation doesn't guarantee zero overlap (enemies still converge on the player), but it
      // should stop them from collapsing into a single stacked point - sample a handful of pairs
      // and confirm they aren't sitting exactly on top of one another.
      let fullyStackedPairs = 0
      let pairsChecked = 0
      for (let i = 0; i < alive.length; i++) {
        for (let j = i + 1; j < alive.length; j++) {
          pairsChecked += 1
          if (distance(alive[i]!.position, alive[j]!.position) < 1) fullyStackedPairs += 1
        }
      }
      expect(pairsChecked).toBeGreaterThan(0)
      expect(fullyStackedPairs / pairsChecked).toBeLessThan(0.05)
    })
  }

  it('does not teleport enemies in a single tick even with a very large pack', () => {
    const engine = new GameEngine(999)
    packEnemies(engine, 150)
    const maxStepDistance = walker.speed * (1 / 60) * 3 // generous bound: a few ticks worth of movement

    for (let i = 0; i < 60; i++) {
      const before = engine.enemyList.filter((e) => e.alive).map((e) => ({ id: e.id, position: { ...e.position } }))
      engine.update(1 / 60, idleInput())
      for (const prior of before) {
        const enemy = engine.enemyList.find((e) => e.id === prior.id)
        if (!enemy || !enemy.alive) continue
        expect(distance(prior.position, enemy.position)).toBeLessThan(maxStepDistance)
      }
    }
  })
})
