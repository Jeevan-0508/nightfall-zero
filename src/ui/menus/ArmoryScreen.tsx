import { useGameStore } from '../../store/gameStore'
import { useMetaStore } from '../../store/metaStore'
import { metaUpgradePool } from '../../content/metaUpgrades'
import { costForRank } from '../../game/meta/metaProgression'

export function ArmoryScreen() {
  const returnToMenu = useGameStore((s) => s.returnToMenu)
  const scrap = useMetaStore((s) => s.scrap)
  const totalRuns = useMetaStore((s) => s.totalRuns)
  const totalKills = useMetaStore((s) => s.totalKills)
  const bestSurvivalTime = useMetaStore((s) => s.bestSurvivalTime)
  const bestWaveReached = useMetaStore((s) => s.bestWaveReached)
  const upgradeRanks = useMetaStore((s) => s.upgradeRanks)
  const purchaseUpgrade = useMetaStore((s) => s.purchaseUpgrade)

  return (
    <div className="menu-screen">
      <div className="armory-panel">
        <h1 className="loadout-title">ARMORY</h1>
        <p className="menu-tagline">SPEND SCRAP ON PERMANENT UPGRADES, CARRIED INTO EVERY RUN</p>

        <div className="armory-stats">
          <span>SCRAP <strong>{scrap}</strong></span>
          <span>RUNS <strong>{totalRuns}</strong></span>
          <span>KILLS <strong>{totalKills}</strong></span>
          <span>BEST SURVIVAL <strong>{Math.floor(bestSurvivalTime)}s</strong></span>
          <span>BEST WAVE <strong>{bestWaveReached}</strong></span>
        </div>

        <div className="armory-list">
          {metaUpgradePool.map((def) => {
            const rank = upgradeRanks[def.id] ?? 0
            const maxed = rank >= def.maxRank
            const cost = costForRank(def.baseCost, def.costGrowth, rank)
            const affordable = scrap >= cost
            return (
              <div key={def.id} className="armory-row">
                <div className="armory-row-info">
                  <span className="armory-row-name">
                    {def.name} <span className="armory-row-rank">RANK {rank}/{def.maxRank}</span>
                  </span>
                  <span className="armory-row-desc">{def.description}</span>
                </div>
                <button
                  className="armory-buy"
                  disabled={maxed || !affordable}
                  onClick={() => purchaseUpgrade(def.id)}
                >
                  {maxed ? 'MAXED' : `BUY ${cost}`}
                </button>
              </div>
            )
          })}
        </div>

        <button className="loadout-back" onClick={returnToMenu}>
          BACK
        </button>
      </div>
    </div>
  )
}
