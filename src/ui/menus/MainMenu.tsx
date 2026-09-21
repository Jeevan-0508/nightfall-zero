import { useGameStore } from '../../store/gameStore'
import { useMetaStore } from '../../store/metaStore'
import { loadRunFromStorage } from '../../game/engine/persistence'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MainMenu() {
  const goToLoadout = useGameStore((s) => s.goToLoadout)
  const goToArmory = useGameStore((s) => s.goToArmory)
  const goToSettings = useGameStore((s) => s.goToSettings)
  const startResumedRun = useGameStore((s) => s.startResumedRun)
  const savedRun = loadRunFromStorage()
  const totalRuns = useMetaStore((s) => s.totalRuns)
  const totalKills = useMetaStore((s) => s.totalKills)
  const bestSurvivalTime = useMetaStore((s) => s.bestSurvivalTime)
  const bestWaveReached = useMetaStore((s) => s.bestWaveReached)

  return (
    <div className="menu-screen">
      <div className="menu-panel">
        <h1 className="menu-title">
          NIGHTFALL <span className="menu-title-slash">//</span> ZERO
        </h1>
        <p className="menu-tagline">SURVIVE. ADAPT. FIGHT BACK.</p>
        {totalRuns > 0 && (
          <div className="menu-stats">
            <div>
              <span className="menu-stats-value">{totalRuns}</span>
              <span className="menu-stats-label">RUNS</span>
            </div>
            <div>
              <span className="menu-stats-value">{totalKills}</span>
              <span className="menu-stats-label">KILLS</span>
            </div>
            <div>
              <span className="menu-stats-value">{bestWaveReached}</span>
              <span className="menu-stats-label">BEST WAVE</span>
            </div>
            <div>
              <span className="menu-stats-value">{formatTime(bestSurvivalTime)}</span>
              <span className="menu-stats-label">BEST TIME</span>
            </div>
          </div>
        )}
        {savedRun && (
          <button className="menu-play menu-continue" onClick={startResumedRun}>
            CONTINUE - WAVE {savedRun.waveIndex} &middot; {formatTime(savedRun.stats.survivalTime)}
          </button>
        )}
        <button className="menu-play" onClick={goToLoadout}>
          {savedRun ? 'NEW RUN' : 'PLAY'}
        </button>
        <button className="menu-armory" onClick={goToArmory}>
          ARMORY
        </button>
        <button className="menu-armory" onClick={goToSettings}>
          SETTINGS
        </button>
        <p className="menu-hint">WASD to move &middot; Mouse to aim &middot; Click to fire &middot; 1-8 to switch weapons &middot; SHIFT to dash &middot; Q for grenade &middot; E to overcharge</p>
        <p className="menu-footer">SAME NIGHT. A DIFFERENT YOU.</p>
      </div>
    </div>
  )
}
