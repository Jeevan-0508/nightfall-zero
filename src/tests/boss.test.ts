import { describe, expect, it } from 'vitest'
import { GameEngine } from '../game/engine/GameEngine'
import { assaultRifle } from '../content/weapons'
import { createEnemy, createPlayer } from '../game/entities/factories'
import { overlord, executioner } from '../content/enemies'
import { updateBoss, getBossStage } from '../game/ai/bossAI'
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

function forceWaveComplete(engine: GameEngine) {
  engine.wave.spawnQueue = []
  engine.wave.enemiesAlive = 0
  for (let i = 0; i < 60; i++) engine.update(0.1, idleInput())
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

  it('runs the same slam/charge/barrage rotation for a different boss definition (Executioner)', () => {
    const boss = createEnemy(executioner, { x: 0, y: 0 })
    const player = createPlayer({ x: 1000, y: 0 }, [], 'none')
    const resolved: string[] = []

    for (let cycle = 0; cycle < 3; cycle++) {
      updateBoss(boss, executioner, player, executioner.bossAttackInterval ?? 3.5)
      const telegraphResult = updateBoss(boss, executioner, player, executioner.bossTelegraphDuration ?? 0.6)
      if (telegraphResult.resolveAttack) resolved.push(telegraphResult.resolveAttack)
      updateBoss(boss, executioner, player, executioner.bossChargeDuration ?? 0.45)
      updateBoss(boss, executioner, player, 0.15)
    }

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

  it('alternates from Overlord to Executioner on the second boss encounter', () => {
    const engine = new GameEngine(60, assaultRifle.id, {}, 'blitz')
    engine.player.health = 99999
    engine.player.armor = 99999

    forceWaveComplete(engine) // -> wave 2
    forceWaveComplete(engine) // -> wave 3, first boss encounter
    expect(engine.enemyList.some((e) => e.defId === overlord.id)).toBe(true)
    expect(engine.enemyList.some((e) => e.defId === executioner.id)).toBe(false)

    forceWaveComplete(engine) // -> wave 4
    forceWaveComplete(engine) // -> wave 5
    forceWaveComplete(engine) // -> wave 6, second boss encounter
    expect(engine.enemyList.some((e) => e.defId === executioner.id)).toBe(true)
  })
})

describe('getBossStage', () => {
  it('is hunt above 66% health, control between 33-66%, and enraged at or below 33%', () => {
    expect(getBossStage(1)).toBe('hunt')
    expect(getBossStage(0.67)).toBe('hunt')
    expect(getBossStage(0.66)).toBe('control')
    expect(getBossStage(0.4)).toBe('control')
    expect(getBossStage(0.33)).toBe('enraged')
    expect(getBossStage(0.1)).toBe('enraged')
  })
})

describe('boss HP-threshold stages (attack tempo, no new attack types)', () => {
  it('attacks faster and telegraphs more briefly at low health than at full health', () => {
    const fullHealth = createEnemy(overlord, { x: 0, y: 0 })
    const player = createPlayer({ x: 1000, y: 0 }, [], 'none')
    updateBoss(fullHealth, overlord, player, overlord.bossAttackInterval ?? 3.5) // idle -> telegraph
    const fullHealthTelegraphDuration = fullHealth.bossTimer
    expect(fullHealth.bossStage).toBe('hunt')

    const lowHealth = createEnemy(overlord, { x: 0, y: 0 })
    lowHealth.health = lowHealth.maxHealth * 0.2
    updateBoss(lowHealth, overlord, player, overlord.bossAttackInterval ?? 3.5) // idle -> telegraph
    const lowHealthTelegraphDuration = lowHealth.bossTimer
    expect(lowHealth.bossStage).toBe('enraged')

    expect(lowHealthTelegraphDuration).toBeLessThan(fullHealthTelegraphDuration)

    // finish the telegraph on both and compare the next idle-phase interval
    updateBoss(fullHealth, overlord, player, fullHealthTelegraphDuration) // attack fires -> attack phase
    updateBoss(fullHealth, overlord, player, 0.15) // -> idle
    const fullHealthInterval = fullHealth.bossTimer

    updateBoss(lowHealth, overlord, player, lowHealthTelegraphDuration)
    updateBoss(lowHealth, overlord, player, 0.15)
    const lowHealthInterval = lowHealth.bossTimer

    expect(lowHealthInterval).toBeLessThan(fullHealthInterval)
  })

  it('still only ever fires slam, charge, or barrage - no new attack types at any stage', () => {
    const boss = createEnemy(overlord, { x: 0, y: 0 })
    boss.health = boss.maxHealth * 0.1
    const player = createPlayer({ x: 1000, y: 0 }, [], 'none')
    const resolved: string[] = []

    for (let cycle = 0; cycle < 3; cycle++) {
      updateBoss(boss, overlord, player, overlord.bossAttackInterval ?? 3.5)
      const telegraphResult = updateBoss(boss, overlord, player, boss.bossTimer)
      if (telegraphResult.resolveAttack) resolved.push(telegraphResult.resolveAttack)
      updateBoss(boss, overlord, player, overlord.bossChargeDuration ?? 0.45)
      updateBoss(boss, overlord, player, 0.15)
    }

    expect(resolved).toEqual(['slam', 'charge', 'barrage'])
    expect(new Set(resolved).size).toBeLessThanOrEqual(3)
  })
})

describe('boss entrance sequence', () => {
  it('holds still, does not attack, and shows a name callout for a brief pause after spawning', () => {
    const engine = new GameEngine(70, assaultRifle.id, {}, 'blitz')
    engine.player.health = 99999
    engine.player.armor = 99999
    forceWaveComplete(engine) // -> wave 2
    engine.wave.spawnQueue = []
    engine.wave.enemiesAlive = 0
    for (let i = 0; i < 60 && !engine.enemyList.some((e) => e.defId === overlord.id); i++) {
      engine.update(0.1, idleInput()) // -> wave 3, first boss encounter; stop the instant it spawns
    }
    const boss = engine.enemyList.find((e) => e.defId === overlord.id)!
    const positionAtSpawn = { ...boss.position }

    expect(engine.getHudSnapshot().bossEntrance?.name).toBe(overlord.name)

    engine.update(1 / 60, idleInput())
    expect(boss.position).toEqual(positionAtSpawn)
    expect(boss.bossPhase).toBe('idle')

    for (let i = 0; i < 90; i++) engine.update(1 / 60, idleInput())
    expect(engine.getHudSnapshot().bossEntrance).toBeNull()
  })
})