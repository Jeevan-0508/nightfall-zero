import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/engine/GameEngine'
import { ARENA_HEIGHT, ARENA_WIDTH, type InputState } from '../game/engine/types'
import { draw, type HitIndicator } from '../game/render/renderer'
import { useHudStore } from '../store/hudStore'
import { useGameStore } from '../store/gameStore'
import { useMetaStore } from '../store/metaStore'
import { getGameMode } from '../content/gameModes'
import { hashSeed } from '../game/engine/rng'
import { weaponOrder } from '../content/weapons'
import {
  playBossBarrage,
  playBossCharge,
  playBossDefeated,
  playBossSlam,
  playBossSpawn,
  playDash,
  playEnemyDeath,
  playEnemySpit,
  playExplosion,
  playGrenadeThrow,
  playGunshot,
  playHit,
  playLevelUp,
  playOverchargeStart,
  playPlayerHit,
  playReloadComplete,
  playReloadStart,
  playWeaponSwitch,
} from '../audio/soundEngine'

const WEAPON_SWITCH_KEYS: Record<string, string> = {
  Digit1: weaponOrder[0].id,
  Digit2: weaponOrder[1].id,
  Digit3: weaponOrder[2].id,
  Digit4: weaponOrder[3].id,
  Digit5: weaponOrder[4].id,
  Digit6: weaponOrder[5].id,
  Digit7: weaponOrder[6].id,
  Digit8: weaponOrder[7].id,
}

const ABILITY_KEYS: Record<string, string> = {
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyQ: 'grenade',
  KeyE: 'overcharge',
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const setSnapshot = useHudStore((s) => s.setSnapshot)
  const endRun = useGameStore((s) => s.endRun)
  const setPendingUpgrades = useGameStore((s) => s.setPendingUpgrades)
  const selectedWeaponId = useGameStore((s) => s.selectedWeaponId)
  const selectedModeId = useGameStore((s) => s.selectedModeId)
  const seedInput = useGameStore((s) => s.seedInput)
  const upgradeRanks = useMetaStore((s) => s.upgradeRanks)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const canvas: HTMLCanvasElement = canvasEl
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const numericSeed = seedInput.trim() ? hashSeed(seedInput.trim()) : undefined
    const engine = new GameEngine(numericSeed, selectedWeaponId, upgradeRanks, selectedModeId)
    const input: InputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      aimX: ARENA_WIDTH / 2,
      aimY: ARENA_HEIGHT / 2,
      firing: false,
      switchTo: null,
      abilityTrigger: null,
    }

    type MovementKey = 'up' | 'down' | 'left' | 'right'
    const keyMap: Record<string, MovementKey> = {
      KeyW: 'up',
      ArrowUp: 'up',
      KeyS: 'down',
      ArrowDown: 'down',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        const store = useGameStore.getState()
        if (!store.pendingUpgrades) store.setPaused(!store.paused)
        e.preventDefault()
        return
      }
      const key = keyMap[e.code]
      if (key) {
        input[key] = true
        e.preventDefault()
        return
      }
      const weaponId = WEAPON_SWITCH_KEYS[e.code]
      if (weaponId) {
        input.switchTo = weaponId
        return
      }
      const abilityId = ABILITY_KEYS[e.code]
      if (abilityId) {
        input.abilityTrigger = abilityId
        e.preventDefault()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      const key = keyMap[e.code]
      if (key) input[key] = false
    }

    function toWorld(clientX: number, clientY: number) {
      const rect = canvas.getBoundingClientRect()
      const scaleX = ARENA_WIDTH / rect.width
      const scaleY = ARENA_HEIGHT / rect.height
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
    }

    function onMouseMove(e: MouseEvent) {
      const world = toWorld(e.clientX, e.clientY)
      input.aimX = world.x
      input.aimY = world.y
    }
    function onMouseDown(e: MouseEvent) {
      if (e.button === 0) input.firing = true
    }
    function onMouseUp(e: MouseEvent) {
      if (e.button === 0) input.firing = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)

    let lastTime = performance.now()
    let rafId = 0
    let ended = false
    let lastUpgradeChoices = engine.pendingUpgradeChoices
    const hitIndicators: HitIndicator[] = []
    let deathStartTime: number | null = null

    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      if (useGameStore.getState().paused) {
        draw(ctx!, engine, { hitIndicators })
        rafId = requestAnimationFrame(tick)
        return
      }

      engine.update(dt, input)
      input.switchTo = null
      input.abilityTrigger = null
      for (const indicator of hitIndicators) indicator.alpha -= dt * 1.6
      while (hitIndicators.length > 0 && hitIndicators[0].alpha <= 0) hitIndicators.shift()

      if (engine.status === 'dead' && deathStartTime === null) deathStartTime = now
      const deathProgress = deathStartTime !== null ? Math.min(1, (now - deathStartTime) / 700) : 0

      draw(ctx!, engine, { hitIndicators, deathProgress })
      setSnapshot(engine.getHudSnapshot())

      if (engine.pendingUpgradeChoices !== lastUpgradeChoices) {
        lastUpgradeChoices = engine.pendingUpgradeChoices
        setPendingUpgrades(
          lastUpgradeChoices.length > 0 ? lastUpgradeChoices : null,
          lastUpgradeChoices.length > 0 ? (id: string) => engine.chooseUpgrade(id) : null,
        )
      }

      for (const event of engine.drainEvents()) {
        switch (event.type) {
          case 'shotFired':
            playGunshot()
            break
          case 'hit':
            playHit(false)
            break
          case 'critHit':
            playHit(true)
            break
          case 'enemyDeath':
            playEnemyDeath()
            break
          case 'playerHit': {
            playPlayerHit()
            let nearest: { position: { x: number; y: number } } | null = null
            let nearestDistSq = Infinity
            for (const enemy of engine.enemyList) {
              if (!enemy.alive) continue
              const dx = enemy.position.x - engine.player.position.x
              const dy = enemy.position.y - engine.player.position.y
              const distSq = dx * dx + dy * dy
              if (distSq < nearestDistSq) {
                nearestDistSq = distSq
                nearest = enemy
              }
            }
            if (nearest) {
              const angle = Math.atan2(
                nearest.position.y - engine.player.position.y,
                nearest.position.x - engine.player.position.x,
              )
              hitIndicators.push({ angle, alpha: 1 })
              if (hitIndicators.length > 6) hitIndicators.shift()
            }
            break
          }
          case 'reloadStart':
            playReloadStart()
            break
          case 'reloadComplete':
            playReloadComplete()
            break
          case 'explosion':
            playExplosion()
            break
          case 'weaponSwitch':
            playWeaponSwitch()
            break
          case 'enemySpit':
            playEnemySpit()
            break
          case 'levelUp':
            playLevelUp()
            break
          case 'dashUsed':
            playDash()
            break
          case 'grenadeThrown':
            playGrenadeThrow()
            break
          case 'overchargeActivated':
            playOverchargeStart()
            break
          case 'bossSpawn':
            playBossSpawn()
            break
          case 'bossSlam':
            playBossSlam()
            break
          case 'bossCharge':
            playBossCharge()
            break
          case 'bossBarrage':
            playBossBarrage()
            break
          case 'bossDefeated':
            playBossDefeated()
            break
        }
      }

      if (engine.status === 'dead' && !ended && deathProgress >= 1) {
        ended = true
        const result = {
          survivalTime: engine.stats.survivalTime,
          kills: engine.stats.kills,
          waveReached: Math.max(engine.stats.waveReached, engine.wave.waveIndex),
          seed: engine.seed,
        }
        endRun(result)
        useMetaStore.getState().recordRunResult(result, getGameMode(selectedModeId).scrapMultiplier)
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [setSnapshot, endRun, setPendingUpgrades, selectedWeaponId, upgradeRanks, selectedModeId, seedInput])

  return (
    <canvas
      ref={canvasRef}
      width={ARENA_WIDTH}
      height={ARENA_HEIGHT}
      className="game-canvas"
    />
  )
}
