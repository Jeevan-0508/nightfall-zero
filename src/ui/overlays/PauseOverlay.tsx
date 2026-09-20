import { useGameStore } from '../../store/gameStore'

export function PauseOverlay() {
  const paused = useGameStore((s) => s.paused)
  const setPaused = useGameStore((s) => s.setPaused)
  const startRun = useGameStore((s) => s.startRun)
  const returnToMenu = useGameStore((s) => s.returnToMenu)

  if (!paused) return null

  return (
    <div className="pause-overlay">
      <div className="pause-panel">
        <h2 className="pause-title">PAUSED</h2>
        <button className="gameover-retry" onClick={() => setPaused(false)}>
          RESUME
        </button>
        <button className="gameover-retry" onClick={startRun}>
          RESTART
        </button>
        <button className="gameover-menu" onClick={returnToMenu}>
          QUIT TO MENU
        </button>
        <p className="pause-hint">PRESS ESC TO RESUME</p>
      </div>
    </div>
  )
}
