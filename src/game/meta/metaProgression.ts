import type { Player } from '../engine/types'
import { metaUpgradePool } from '../../content/metaUpgrades'

export interface RunResult {
  survivalTime: number
  kills: number
  waveReached: number
}

/** Scrap payout for a finished run, boosted by the Scavenger's Network rank and the run's game-mode multiplier. */
export function calculateScrapEarned(
  result: RunResult,
  ranks: Record<string, number>,
  modeScrapMultiplier = 1,
): number {
  const scavengerRank = ranks['scavenger'] ?? 0
  const base = result.kills * 2 + Math.floor(result.survivalTime) + result.waveReached * 10
  return Math.floor(base * (1 + scavengerRank * 0.1) * modeScrapMultiplier)
}

/** Scrap cost to raise a meta-upgrade from currentRank to currentRank + 1. */
export function costForRank(baseCost: number, costGrowth: number, currentRank: number): number {
  return Math.round(baseCost * Math.pow(costGrowth, currentRank))
}

/** Applies every owned meta-upgrade rank directly to a freshly created player. Unknown ids and rank 0 are no-ops. */
export function applyMetaUpgrades(player: Player, ranks: Record<string, number>): void {
  for (const def of metaUpgradePool) {
    const rank = ranks[def.id] ?? 0
    if (rank > 0) def.apply(player, rank)
  }
}
