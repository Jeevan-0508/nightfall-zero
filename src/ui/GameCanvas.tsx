import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/engine/GameEngine'
import { ARENA_HEIGHT, ARENA_WIDTH, type InputState } from '../game/engine/types'
import { draw } from '../game/render/renderer'
import { useHudStore } from '../store/hudStore'
import { useGameStore } from '../store/gameStore'
import { weaponOrder } from '../content/weapons'
import {
  playEnemyDeath,
  playExplosion,
  playGunshot,
  playHit,
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

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const setSnapshot = useHudStore((s) => s.setSnapshot)
  const endRun = useGameStore((s) => s.endRun)

  useEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) return
    const canvas: HTMLCanvasElement = canvasEl
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = new GameEngine()
    const input: InputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      aimX: ARENA_WIDTH / 2,
      aimY: ARENA_HEIGHT / 2,
      firing: false,
      switchTo: null,
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
      const key = keyMap[e.code]
      if (key) {
        input[key] = true
        e.preventDefault()
        return
      }
      const weaponId = WEAPON_SWITCH_KEYS[e.code]
      if (weaponId) input.switchTo = weaponId
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

    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      engine.update(dt, input)
      input.switchTo = null
      draw(ctx!, engine)
      setSnapshot(engine.getHudSnapshot())

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
          case 'playerHit':
            playPlayerHit()
            break
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
        }
      }

      if (engine.status === 'dead' && !ended) {
        ended = true
        endRun({
          survivalTime: engine.stats.survivalTime,
          kills: engine.stats.kills,
          waveReached: Math.max(engine.stats.waveReached, engine.wave.waveIndex),
        })
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
  }, [setSnapshot, endRun])

  return (
    <canvas
      ref={canvasRef}
      width={ARENA_WIDTH}
      height={ARENA_HEIGHT}
      className="game-canvas"
    />
  )
}
