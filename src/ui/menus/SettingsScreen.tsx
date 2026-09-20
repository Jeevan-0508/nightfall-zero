import { useGameStore } from '../../store/gameStore'
import { useSettingsStore } from '../../store/settingsStore'

export function SettingsScreen() {
  const returnToMenu = useGameStore((s) => s.returnToMenu)
  const masterVolume = useSettingsStore((s) => s.masterVolume)
  const setMasterVolume = useSettingsStore((s) => s.setMasterVolume)

  return (
    <div className="menu-screen">
      <div className="loadout-panel">
        <h1 className="loadout-title">SETTINGS</h1>
        <p className="menu-tagline">SAVED ON THIS DEVICE, APPLIES IMMEDIATELY</p>

        <div className="settings-row">
          <label className="settings-label" htmlFor="master-volume">
            MASTER VOLUME
          </label>
          <input
            id="master-volume"
            className="settings-slider"
            type="range"
            min={0}
            max={100}
            value={Math.round(masterVolume * 100)}
            onChange={(e) => setMasterVolume(Number(e.target.value) / 100)}
          />
          <span className="settings-value">{Math.round(masterVolume * 100)}%</span>
        </div>

        <button className="loadout-back" onClick={returnToMenu}>
          BACK
        </button>
      </div>
    </div>
  )
}
