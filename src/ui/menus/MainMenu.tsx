import { useGameStore } from '../../store/gameStore'

export function MainMenu() {
  const goToLoadout = useGameStore((s) => s.goToLoadout)

  return (
    <div className="menu-screen">
      <div className="menu-panel">
        <h1 className="menu-title">
          NIGHTFALL <span className="menu-title-slash">//</span> ZERO
        </h1>
        <p className="menu-tagline">SURVIVE. ADAPT. FIGHT BACK.</p>
        <button className="menu-play" onClick={goToLoadout}>
          PLAY
        </button>
        <p className="menu-hint">WASD to move &middot; Mouse to aim &middot; Click to fire &middot; 1-8 to switch weapons &middot; SHIFT to dash &middot; Q for grenade &middot; E to overcharge</p>
        <p className="menu-footer">SAME NIGHT. A DIFFERENT YOU.</p>
      </div>
    </div>
  )
}
