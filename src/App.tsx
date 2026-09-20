import { useGameStore } from './store/gameStore'
import { GameCanvas } from './ui/GameCanvas'
import { HUD } from './ui/hud/HUD'
import { MainMenu } from './ui/menus/MainMenu'
import { LoadoutScreen } from './ui/menus/LoadoutScreen'
import { ArmoryScreen } from './ui/menus/ArmoryScreen'
import { SettingsScreen } from './ui/menus/SettingsScreen'
import { PauseOverlay } from './ui/overlays/PauseOverlay'
import { GameOverOverlay } from './ui/overlays/GameOverOverlay'
import { UpgradeOverlay } from './ui/overlays/UpgradeOverlay'

export default function App() {
  const view = useGameStore((s) => s.view)
  const runId = useGameStore((s) => s.runId)

  if (view === 'menu') return <MainMenu />
  if (view === 'loadout') return <LoadoutScreen />
  if (view === 'armory') return <ArmoryScreen />
  if (view === 'settings') return <SettingsScreen />

  return (
    <div className="game-root">
      <div className="game-stage">
        <GameCanvas key={runId} />
        <HUD />
        {view === 'gameover' && <GameOverOverlay />}
        {view === 'playing' && <UpgradeOverlay />}
        {view === 'playing' && <PauseOverlay />}
      </div>
    </div>
  )
}
