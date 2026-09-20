import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function GameOverOverlay() {
  const lastResult = useGameStore((s) => s.lastResult)
  const startRun = useGameStore((s) => s.startRun)
  const returnToMenu = useGameStore((s) => s.returnToMenu)
  const [copied, setCopied] = useState(false)

  function copySeed() {
    if (lastResult === null) return
    void navigator.clipboard.writeText(String(lastResult.seed))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="gameover-overlay">
      <div className="gameover-panel">
        <h2 className="gameover-title">YOU DIED</h2>
        <p className="gameover-subtitle">THE NIGHT TAKES ANOTHER</p>
        <div className="gameover-stats">
          <div>
            <span className="gameover-stat-value">{formatTime(lastResult?.survivalTime ?? 0)}</span>
            <span className="gameover-stat-label">SURVIVED</span>
          </div>
          <div>
            <span className="gameover-stat-value">{lastResult?.kills ?? 0}</span>
            <span className="gameover-stat-label">KILLS</span>
          </div>
          <div>
            <span className="gameover-stat-value">{lastResult?.waveReached ?? 0}</span>
            <span className="gameover-stat-label">WAVE REACHED</span>
          </div>
        </div>
        <button className="gameover-seed" onClick={copySeed}>
          {copied ? 'COPIED' : `SEED ${lastResult?.seed ?? 0} · COPY`}
        </button>
        <button className="gameover-retry" onClick={startRun}>
          TRY AGAIN
        </button>
        <button className="gameover-menu" onClick={returnToMenu}>
          MAIN MENU
        </button>
      </div>
    </div>
  )
}
