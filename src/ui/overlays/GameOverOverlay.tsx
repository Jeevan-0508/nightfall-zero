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
        {lastResult && <div className={`gameover-grade gameover-grade-${lastResult.grade}`}>{lastResult.grade}</div>}
        <div className="gameover-stats">
          <div>
            <span className="gameover-stat-value">{formatTime(lastResult?.survivalTime ?? 0)}</span>
            <span className="gameover-stat-label">SURVIVED{lastResult?.isNewBestTime ? <span className="gameover-new-best"> NEW BEST</span> : null}</span>
          </div>
          <div>
            <span className="gameover-stat-value">{lastResult?.kills ?? 0}</span>
            <span className="gameover-stat-label">KILLS</span>
          </div>
          <div>
            <span className="gameover-stat-value">{lastResult?.waveReached ?? 0}</span>
            <span className="gameover-stat-label">WAVE REACHED{lastResult?.isNewBestWave ? <span className="gameover-new-best"> NEW BEST</span> : null}</span>
          </div>
        </div>
        {lastResult && lastResult.chosenUpgrades.length > 0 && (
          <div className="gameover-recap">
            <p className="gameover-recap-title">UPGRADES TAKEN</p>
            <div className="gameover-recap-list">
              {lastResult.chosenUpgrades.map((upgrade, i) => (
                <span key={`${upgrade.id}-${i}`} className={`gameover-recap-item gameover-recap-item-${upgrade.rarity}`}>
                  {upgrade.name}
                </span>
              ))}
            </div>
          </div>
        )}
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
