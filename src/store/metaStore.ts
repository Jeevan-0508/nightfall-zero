import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { metaUpgradePool } from '../content/metaUpgrades'
import { calculateScrapEarned, costForRank, type RunResult } from '../game/meta/metaProgression'

interface MetaStore {
  scrap: number
  totalRuns: number
  totalKills: number
  bestSurvivalTime: number
  bestWaveReached: number
  upgradeRanks: Record<string, number>
  recordRunResult: (result: RunResult, modeScrapMultiplier?: number) => void
  purchaseUpgrade: (id: string) => void
}

export const useMetaStore = create<MetaStore>()(
  persist(
    (set, get) => ({
      scrap: 0,
      totalRuns: 0,
      totalKills: 0,
      bestSurvivalTime: 0,
      bestWaveReached: 0,
      upgradeRanks: {},
      recordRunResult: (result, modeScrapMultiplier = 1) => {
        const earned = calculateScrapEarned(result, get().upgradeRanks, modeScrapMultiplier)
        set((s) => ({
          scrap: s.scrap + earned,
          totalRuns: s.totalRuns + 1,
          totalKills: s.totalKills + result.kills,
          bestSurvivalTime: Math.max(s.bestSurvivalTime, result.survivalTime),
          bestWaveReached: Math.max(s.bestWaveReached, result.waveReached),
        }))
      },
      purchaseUpgrade: (id) => {
        const def = metaUpgradePool.find((d) => d.id === id)
        if (!def) return
        const currentRank = get().upgradeRanks[id] ?? 0
        if (currentRank >= def.maxRank) return
        const cost = costForRank(def.baseCost, def.costGrowth, currentRank)
        if (get().scrap < cost) return
        set((s) => ({
          scrap: s.scrap - cost,
          upgradeRanks: { ...s.upgradeRanks, [id]: currentRank + 1 },
        }))
      },
    }),
    { name: 'nightfall-zero-meta' },
  ),
)
