import { useEffect, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { DEFAULT_KEYBINDS, useSettingsStore, type RebindableAction } from '../../store/settingsStore'

const ACTION_LABELS: Record<RebindableAction, string> = {
  up: 'MOVE UP',
  down: 'MOVE DOWN',
  left: 'MOVE LEFT',
  right: 'MOVE RIGHT',
  dash: 'DASH',
  grenade: 'GRENADE',
  overcharge: 'OVERCHARGE',
}

const CODE_LABELS: Record<string, string> = {
  ShiftLeft: 'SHIFT',
  ShiftRight: 'R-SHIFT',
  Space: 'SPACE',
  ControlLeft: 'CTRL',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
}

function formatKeyCode(code: string): string {
  if (CODE_LABELS[code]) return CODE_LABELS[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  return code.length === 1 ? code.toUpperCase() : code
}

export function SettingsScreen() {
  const returnToMenu = useGameStore((s) => s.returnToMenu)
  const masterVolume = useSettingsStore((s) => s.masterVolume)
  const setMasterVolume = useSettingsStore((s) => s.setMasterVolume)
  const reducedMotion = useSettingsStore((s) => s.reducedMotion)
  const setReducedMotion = useSettingsStore((s) => s.setReducedMotion)
  const screenShakeIntensity = useSettingsStore((s) => s.screenShakeIntensity)
  const setScreenShakeIntensity = useSettingsStore((s) => s.setScreenShakeIntensity)
  const colorblindMode = useSettingsStore((s) => s.colorblindMode)
  const setColorblindMode = useSettingsStore((s) => s.setColorblindMode)
  const autoAim = useSettingsStore((s) => s.autoAim)
  const setAutoAim = useSettingsStore((s) => s.setAutoAim)
  const keybinds = useSettingsStore((s) => s.keybinds)
  const setKeybind = useSettingsStore((s) => s.setKeybind)
  const resetKeybinds = useSettingsStore((s) => s.resetKeybinds)

  const [listeningFor, setListeningFor] = useState<RebindableAction | null>(null)

  useEffect(() => {
    if (!listeningFor) return
    const action = listeningFor
    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      if (e.code === 'Escape') {
        setListeningFor(null)
        return
      }
      setKeybind(action, e.code)
      setListeningFor(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [listeningFor, setKeybind])

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

        <div className="settings-row">
          <label className="settings-label" htmlFor="screen-shake">
            SCREEN SHAKE
          </label>
          <input
            id="screen-shake"
            className="settings-slider"
            type="range"
            min={0}
            max={150}
            value={Math.round(screenShakeIntensity * 100)}
            disabled={reducedMotion}
            onChange={(e) => setScreenShakeIntensity(Number(e.target.value) / 100)}
          />
          <span className="settings-value">{reducedMotion ? 'OFF' : `${Math.round(screenShakeIntensity * 100)}%`}</span>
        </div>

        <div className="settings-row settings-row-toggle">
          <label className="settings-label" htmlFor="reduced-motion">
            REDUCED MOTION
          </label>
          <input
            id="reduced-motion"
            className="settings-checkbox"
            type="checkbox"
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
          />
          <span className="settings-hint">Disables screen shake, death-zoom, and dash after-image trails</span>
        </div>

        <div className="settings-row settings-row-toggle">
          <label className="settings-label" htmlFor="colorblind-mode">
            COLORBLIND-SAFE HUD
          </label>
          <input
            id="colorblind-mode"
            className="settings-checkbox"
            type="checkbox"
            checked={colorblindMode}
            onChange={(e) => setColorblindMode(e.target.checked)}
          />
          <span className="settings-hint">Swaps the boss-alive vignette tint away from low-health red</span>
        </div>

        <div className="settings-row settings-row-toggle">
          <label className="settings-label" htmlFor="auto-aim">
            AUTO-AIM
          </label>
          <input
            id="auto-aim"
            className="settings-checkbox"
            type="checkbox"
            checked={autoAim}
            onChange={(e) => setAutoAim(e.target.checked)}
          />
          <span className="settings-hint">
            Once your mouse sits still, locks onto and fires at the nearest enemy on its own - move the mouse and
            manual aim/fire takes back over instantly. Also toggleable mid-run from the HUD, below the minimap.
          </span>
        </div>

        <div className="settings-keybinds">
          <h2 className="settings-keybinds-title">KEYBINDS</h2>
          {(Object.keys(DEFAULT_KEYBINDS) as RebindableAction[]).map((action) => (
            <div key={action} className="settings-row settings-keybind-row">
              <span className="settings-label">{ACTION_LABELS[action]}</span>
              <button
                className="settings-rebind-button"
                onClick={() => setListeningFor(action)}
              >
                {listeningFor === action ? 'PRESS A KEY...' : formatKeyCode(keybinds[action])}
              </button>
            </div>
          ))}
          <button className="settings-rebind-reset" onClick={() => { resetKeybinds(); setListeningFor(null) }}>
            RESET TO DEFAULTS
          </button>
        </div>

        <button className="loadout-back" onClick={returnToMenu}>
          BACK
        </button>
      </div>
    </div>
  )
}
