import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { createEnemy, createPlayer } from '../game/entities/factories'
import { overlord } from '../content/enemies'
import { updateBoss } from '../game/ai/bossAI'
import type { InputState } from '../game/engine/types'

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    aimX: 0,
    aimY: 0,
    firing: false,
    switchTo: null,
    abilityTrigger: null,
    ...overrides,
  }
}

describe('updateBoss (pure state machine)', () => {
  it('chases the player while idle', () => {
    const boss = createEnemy(overlord, { x: 0, y: 0 })
    const player = createPlayer({ x: 1000, y: 0 }, [], 'none')
    updateBoss(boss, overlord, player, 0.1)
    expect(boss.position.x).toBeGreaterThan(0)
    expect(boss.bossPhase).toBe('idle')
  })

  it('cycles telegraph -> attack through the fixed slam, charge, barrage rotation', () => {
    const boss = createEnemy(overlord, { x: 0, y: 0 })
    const player = createPlayer({ x: 1000, y: 0 }, [], 'none')
    const resolved: string[] = []

    // idle -> telegraph (slam)
    let result = updateBoss(boss, overlord, player, overlord.bossAttackInterval ?? 3.5)
    expect(result.resolveAttack).toBeNull()
    expect(boss.bossPhase).toBe('telegraph')
    // telegraph -> attack (fires exactly once)
    result = updateBoss(boss, overlord, player, overlord.bossTelegraphDuration ?? 0.6)
    if (result.resolveAttack) resolved.push(result.resolveAttack)
    // attack -> idle
    result = updateBoss(boss, overlord, player, 0.15)
    expect(result.resolveAttack).toBeNull()
    expect(boss.bossPhase).toBe('idle')

    // second cycle: idle -> telegraph (charge)
    updateBoss(boss, overlord, player, overlord.bossAttackInterval ?? 3.5)
    result = updateBoss(boss, overlord, player, overlord.bossTelegraphDuration ?? 0.6)
    if (result.resolveAttack) resolved.push(result.resolveAttack)
    updateBoss(boss, overlord, player, overlord.bossChargeDuration ?? 0.45)

    // third cycle: idle -> telegraph (barrage)
    updateBoss(boss, overlord, player, overlord.bossAttackInterval ?? 3.5)
    result = updateBoss(boss, overlord, player, overlord.bossTelegraphDuration ?? 0.6)
    if (result.resolveAttack) resolved.push(result.resolveAttack)

    expect(resolved).toEqual(['slam', 'charge', 'barrage'])
  })

  it('does not resolve an attack until the telegraph window fully elapses', () => {
    const boss = createEnemy(overlord, { x: 0, y: 0 })
    const player = createPlayer({ x: 1000, y: 0 }, [], 'none')
    updateBoss(boss, overlord, player, overlord.bossAttackInterval ?? 3.5)
    expect(boss.bossPhase).toBe('telegraph')

    const result = updateBoss(boss, overlord, player, (overlord.bossTelegraphDuration ?? 0.6) - 0.1)
    expect(result.resolveAttack).toBeNull()
    expect(boss.bossPhase).toBe('telegraph')
  })

  it('locks a direction for the charge attack and dashes fast along it', () => {
    const boss = createEnemy(overlord, { x: 0, y: 0 })
    const player = createPlayer({ x: 0, y: 500 }, [], 'none')

    updateBoss(boss, overlord, player, overlord.bossAttackInterval ?? 3.5) // -> telegraph (slam)
    updateBoss(boss, overlord, player, overlord.bossTelegraphDuration ?? 0.6) // slam fires -> idle window
    updateBoss(boss, overlord, player, 0.15) // -> idle
    updateBoss(boss, overlord, player, overlord.bossAttackInterval ?? 3.5) // -> telegraph (charge)
    const result = updateBoss(boss, overlord, player, overlord.bossTelegraphDuration ?? 0.6) // charge fires

    expect(result.resolveAttack).toBe('charge')
    expect(boss.bossLockedDir.y).toBeCloseTo(1, 1)

    const positionBefore = { ...boss.position }
    updateBoss(boss, overlord, player, 0.1)
    const distanceMoved = boss.position.y - positionBefore.y
    const expectedSpeed = overlord.speed * (overlord.bossChargeSpeedMultiplier ?? 3)
    expect(distanceMoved).toBeCloseTo(expectedSpeed * 0.1, 0)
  })
})

describe('GameEngine boss integration', () => {
  it('reports a live boss in the HUD snapshot and clears it once defeated', () => {
    const engine = new GameEngine(50)
    const boss = createEnemy(overlord, { x: 500, y: 100 })
    engine.enemyList.push(boss)

    expect(engine.getHudSnapshot().boss?.name).toBe(overlord.name)

    boss.alive = false
    expect(engine.getHudSnapshot().boss).toBeNull()
  })

  it('damages the player when a slam attack resolves within its blast radius', () => {
    const engine = new GameEngine(51)
    engine.player.position = { x: 100, y: 100 }
    const boss = createEnemy(overlord, { x: 150, y: 100 })
    boss.bossPhase = 'telegraph'
    boss.bossAttackId = 'slam'
    boss.bossTimer = 0.01
    engine.enemyList.push(boss)
    const totalBefore = engine.player.health + engine.player.armor

    engine.update(1 / 60, idleInput())
    const events = engine.drainEvents().map((e) => e.type)

    expect(events).toContain('bossSlam')
    expect(engine.player.health + engine.player.armor).toBeLessThan(totalBefore)
  })

  it('fires a spread of projectiles toward the player when a barrage attack resolves', () => {
    const engine = new GameEngine(52)
    engine.player.position = { x: 100, y: 100 }
    const boss = createEnemy(overlord, { x: 100, y: 300 })
    boss.bossPhase = 'telegraph'
    boss.bossAttackId = 'barrage'
    boss.bossTimer = 0.01
    engine.enemyList.push(boss)

    engine.update(1 / 60, idleInput())
    const events = engine.drainEvents().map((e) => e.type)

    expect(events).toContain('bossBarrage')
    expect(engine.enemyProjectiles.length).toBe(overlord.bossBarrageCount)
  })

  it('defeating the boss fires bossDefeated, awards a kill, and clears its wave slot', () => {
    const engine = new GameEngine(53)
    engine.player.position = { x: 100, y: 100 }
    const boss = createEnemy(overlord, { x: 160, y: 100 })
    boss.health = 5
    engine.enemyList.push(boss)
    engine.wave.enemiesAlive += 1
    const enemiesAliveBefore = engine.wave.enemiesAlive
    const killsBefore = engine.stats.kills

    const input = idleInput({ aimX: 160, aimY: 100, firing: true })
    let bossDefeatedFired = false
    for (let i = 0; i < 60 && boss.alive; i++) {
      engine.update(1 / 60, input)
      if (engine.drainEvents().some((e) => e.type === 'bossDefeated')) bossDefeatedFired = true
    }

    expect(boss.alive).toBe(false)
    expect(bossDefeatedFired).toBe(true)
    expect(engine.stats.kills).toBe(killsBefore + 1)
    expect(engine.wave.enemiesAlive).toBe(enemiesAliveBefore - 1)
  })
})
