import { useEffect, useRef } from 'react'
import { GameEngine } from '../game/engine/GameEngine'
import { ARENA_HEIGHT, ARENA_WIDTH, type InputState } from '../game/engine/types'
import { draw } from '../game/render/renderer'
import { useHudStore } from '../store/hudStore'
import { useGameStore } from '../store/gameStore'

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
    const input: InputState = { up: false, down: false, left: false, right: false, aimX: ARENA_WIDTH / 2, aimY: ARENA_HEIGHT / 2, firing: false }

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

    function tick(now: number) {
      const dt = Math.min(0.05, (now - lastTime) / 1000)
      lastTime = now

      engine.update(dt, input)
      draw(ctx!, engine)
      setSnapshot(engine.getHudSnapshot())

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
