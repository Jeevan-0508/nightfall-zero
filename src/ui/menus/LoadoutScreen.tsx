import { useGameStore } from '../../store/gameStore'
import { weaponOrder } from '../../content/weapons'
import { gameModes } from '../../content/gameModes'

export function LoadoutScreen() {
  const selectedWeaponId = useGameStore((s) => s.selectedWeaponId)
  const selectWeapon = useGameStore((s) => s.selectWeapon)
  const selectedModeId = useGameStore((s) => s.selectedModeId)
  const selectMode = useGameStore((s) => s.selectMode)
  const seedInput = useGameStore((s) => s.seedInput)
  const setSeedInput = useGameStore((s) => s.setSeedInput)
  const startRun = useGameStore((s) => s.startRun)
  const returnToMenu = useGameStore((s) => s.returnToMenu)

  return (
    <div className="menu-screen">
      <div className="loadout-panel">
        <h1 className="loadout-title">CHOOSE YOUR WEAPON</h1>
        <p className="menu-tagline">STARTING LOADOUT. EVERY OTHER WEAPON IS STILL YOURS, 1-8 SWAPS MID-RUN</p>
        <div className="loadout-rack">
          {weaponOrder.map((weapon, i) => (
            <button
              key={weapon.id}
              className={weapon.id === selectedWeaponId ? 'loadout-card loadout-card-selected' : 'loadout-card'}
              onClick={() => selectWeapon(weapon.id)}
            >
              <span className="loadout-card-index">{i + 1}</span>
              <span className="loadout-card-name">{weapon.name}</span>
              <span className="loadout-card-stats">
                DMG {weapon.damage} &middot; RATE {weapon.fireRate.toFixed(1)} &middot; MAG {weapon.magazineSize}
              </span>
            </button>
          ))}
        </div>

        <h2 className="loadout-subtitle">GAME MODE</h2>
        <div className="loadout-modes">
          {gameModes.map((mode) => (
            <button
              key={mode.id}
              className={mode.id === selectedModeId ? 'mode-card mode-card-selected' : 'mode-card'}
              onClick={() => selectMode(mode.id)}
            >
              <span className="mode-card-name">{mode.name}</span>
              <span className="mode-card-desc">{mode.description}</span>
            </button>
          ))}
        </div>

        <div className="settings-row loadout-seed-row">
          <label className="settings-label" htmlFor="seed-input">
            SEED
          </label>
          <input
            id="seed-input"
            className="loadout-seed-input"
            type="text"
            placeholder="Leave blank for a random run"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
          />
        </div>

        <button className="menu-play" onClick={startRun}>
          START RUN
        </button>
        <button className="loadout-back" onClick={returnToMenu}>
          BACK
        </button>
      </div>
    </div>
  )
}
