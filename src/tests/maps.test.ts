import { describe, expect, it } from 'vitest'
import { circleIntersectsAnyObstacle, resolveObstacleCollisions } from '../game/collision/collision'
import { maps, pickMap } from '../content/maps'
import { mulberry32 } from '../game/engine/rng'
import { pickSpawnPosition } from '../game/waves/waveManager'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy } from '../game/entities/factories'
import { walker } from '../content/enemies'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { up: false, down: false, left: false, right: false, aimX: 0, aimY: 0, firing: false, switchTo: null, abilityTrigger: null, ...overrides }
}

describe('resolveObstacleCollisions', () => {
  it('pushes an overlapping circle out to the obstacle edge', () => {
    const obstacle = { position: { x: 100, y: 100 }, radius: 20 }
    const resolved = resolveObstacleCollisions({ x: 105, y: 100 }, 10, [obstacle])
    const dist = Math.hypot(resolved.x - obstacle.position.x, resolved.y - obstacle.position.y)
    expect(dist).toBeCloseTo(30, 4)
  })

  it('leaves a non-overlapping position untouched', () => {
    const obstacle = { position: { x: 100, y: 100 }, radius: 20 }
    const resolved = resolveObstacleCollisions({ x: 500, y: 500 }, 10, [obstacle])
    expect(resolved).toEqual({ x: 500, y: 500 })
  })

  it('resolves overlaps against multiple obstacles in sequence', () => {
    const obstacles = [
      { position: { x: 100, y: 100 }, radius: 20 },
      { position: { x: 100, y: 140 }, radius: 20 },
    ]
    const resolved = resolveObstacleCollisions({ x: 100, y: 100 }, 10, obstacles)
    for (const obstacle of obstacles) {
      const dist = Math.hypot(resolved.x - obstacle.position.x, resolved.y - obstacle.position.y)
      expect(dist).toBeGreaterThanOrEqual(obstacle.radius + 10 - 0.01)
    }
  })
})

describe('circleIntersectsAnyObstacle', () => {
  const obstacles = [{ position: { x: 0, y: 0 }, radius: 15 }]

  it('returns true when the circle overlaps an obstacle', () => {
    expect(circleIntersectsAnyObstacle({ x: 10, y: 0 }, 10, obstacles)).toBe(true)
  })

  it('returns false when the circle is clear of every obstacle', () => {
    expect(circleIntersectsAnyObstacle({ x: 500, y: 500 }, 10, obstacles)).toBe(false)
  })
})

describe('pickMap', () => {
  it('always returns one of the authored map definitions', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const map = pickMap(rng)
      expect(maps.map((m) => m.id)).toContain(map.id)
    }
  })
})

describe('GameEngine map selection', () => {
  it('is deterministic for a given seed', () => {
    const a = new GameEngine(123)
    const b = new GameEngine(123)
    expect(a.map.id).toBe(b.map.id)
  })

  it('assigns one of the authored maps to every new engine', () => {
    const engine = new GameEngine(9)
    expect(maps.map((m) => m.id)).toContain(engine.map.id)
  })
})

describe('pickSpawnPosition with obstacles', () => {
  it('never returns a point overlapping a given obstacle', () => {
    const rng = mulberry32(42)
    const playerPos = { x: 480, y: 300 }
    const obstacles = [
      { position: { x: 480, y: 24 }, radius: 40 },
      { position: { x: 24, y: 300 }, radius: 40 },
      { position: { x: 480, y: 576 }, radius: 40 },
      { position: { x: 936, y: 300 }, radius: 40 },
    ]
    for (let i = 0; i < 100; i++) {
      const pos = pickSpawnPosition(rng, playerPos, obstacles)
      expect(circleIntersectsAnyObstacle(pos, 16, obstacles)).toBe(false)
    }
  })
})

describe('GameEngine obstacle collision integration', () => {
  it('never lets the player tunnel through an obstacle directly in their path', () => {
    const engine = new GameEngine(5)
    engine.player.position = { x: 300, y: 300 }
    const obstacle = { position: { x: 340, y: 300 }, radius: 20 }
    engine.map = { id: 'test', name: 'Test', obstacles: [obstacle] }

    for (let i = 0; i < 120; i++) {
      engine.update(1 / 60, idleInput({ right: true }))
    }

    const dist = Math.hypot(
      engine.player.position.x - obstacle.position.x,
      engine.player.position.y - obstacle.position.y,
    )
    expect(dist).toBeGreaterThanOrEqual(obstacle.radius + engine.player.radius - 0.01)
  })

  it('never lets an enemy tunnel through an obstacle while chasing the player', () => {
    const engine = new GameEngine(6)
    engine.player.position = { x: 500, y: 300 }
    const enemy = createEnemy(walker, { x: 200, y: 300 })
    const obstacle = { position: { x: 350, y: 300 }, radius: 25 }
    engine.map = { id: 'test', name: 'Test', obstacles: [obstacle] }
    engine.enemyList.push(enemy)

    for (let i = 0; i < 300 && enemy.alive; i++) {
      engine.update(1 / 60, idleInput())
    }

    const dist = Math.hypot(enemy.position.x - obstacle.position.x, enemy.position.y - obstacle.position.y)
    expect(dist).toBeGreaterThanOrEqual(obstacle.radius + walker.radius - 0.01)
  })
})
