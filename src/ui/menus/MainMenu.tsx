import { useGameStore } from '../../store/gameStore'

export function MainMenu() {
  const startRun = useGameStore((s) => s.startRun)

  return (
    <div className="menu-screen">
      <div className="menu-panel">
        <h1 className="menu-title">
          NIGHTFALL <span className="menu-title-slash">//</span> ZERO
        </h1>
        <p className="menu-tagline">SURVIVE. ADAPT. FIGHT BACK.</p>
        <button className="menu-play" onClick={startRun}>
          PLAY
        </button>
        <p className="menu-hint">WASD to move &middot; Mouse to aim &middot; Click to fire &middot; 1-8 to switch weapons</p>
        <p className="menu-footer">SAME NIGHT. A DIFFERENT YOU.</p>
      </div>
    </div>
  )
}
