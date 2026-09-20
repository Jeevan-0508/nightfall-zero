import { useGameStore } from './store/gameStore'
import { GameCanvas } from './ui/GameCanvas'
import { HUD } from './ui/hud/HUD'
import { MainMenu } from './ui/menus/MainMenu'
import { GameOverOverlay } from './ui/overlays/GameOverOverlay'

export default function App() {
  const view = useGameStore((s) => s.view)
  const runId = useGameStore((s) => s.runId)

  if (view === 'menu') return <MainMenu />

  return (
    <div className="game-root">
      <div className="game-stage">
        <GameCanvas key={runId} />
        <HUD />
        {view === 'gameover' && <GameOverOverlay />}
      </div>
    </div>
  )
}
