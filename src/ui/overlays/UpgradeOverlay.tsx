import { useGameStore } from '../../store/gameStore'

export function UpgradeOverlay() {
  const pendingUpgrades = useGameStore((s) => s.pendingUpgrades)
  const chooseUpgrade = useGameStore((s) => s.chooseUpgrade)

  if (!pendingUpgrades) return null

  return (
    <div className="upgrade-overlay">
      <div className="upgrade-panel">
        <h2 className="upgrade-title">LEVEL UP</h2>
        <p className="upgrade-subtitle">CHOOSE ONE</p>
        <div className="upgrade-options">
          {pendingUpgrades.map((option) => (
            <button key={option.id} className="upgrade-option" onClick={() => chooseUpgrade(option.id)}>
              <span className="upgrade-option-name">{option.name}</span>
              <span className="upgrade-option-desc">{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
