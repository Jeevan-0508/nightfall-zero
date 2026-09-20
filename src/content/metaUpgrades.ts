import type { Player } from '../game/engine/types'

export interface MetaUpgradeDefinition {
  id: string
  name: string
  description: string
  baseCost: number
  costGrowth: number
  maxRank: number
  apply: (player: Player, rank: number) => void
}

/** Permanent, scrap-bought upgrades applied once per run in GameEngine's constructor. Ranks persist across runs via metaStore. */
export const metaUpgradePool: MetaUpgradeDefinition[] = [
  {
    id: 'vitality',
    name: 'Vitality Implant',
    description: '+10 max health per rank',
    baseCost: 50,
    costGrowth: 1.6,
    maxRank: 5,
    apply: (p, rank) => {
      p.maxHealth += 10 * rank
      p.health += 10 * rank
    },
  },
  {
    id: 'plating',
    name: 'Plating Mod',
    description: '+10 max armor per rank',
    baseCost: 50,
    costGrowth: 1.6,
    maxRank: 5,
    apply: (p, rank) => {
      p.maxArmor += 10 * rank
      p.armor += 10 * rank
    },
  },
  {
    id: 'combatDrills',
    name: 'Combat Drills',
    description: '+5% weapon damage per rank',
    baseCost: 75,
    costGrowth: 1.7,
    maxRank: 5,
    apply: (p, rank) => {
      p.upgrades.damageMultiplier *= 1 + 0.05 * rank
    },
  },
  {
    id: 'conditioning',
    name: 'Field Conditioning',
    description: '+5% move speed per rank',
    baseCost: 90,
    costGrowth: 1.8,
    maxRank: 3,
    apply: (p, rank) => {
      p.upgrades.moveSpeedMultiplier *= 1 + 0.05 * rank
    },
  },
  {
    id: 'scavenger',
    name: "Scavenger's Network",
    description: '+10% scrap earned per rank',
    baseCost: 100,
    costGrowth: 1.9,
    maxRank: 3,
    apply: () => {},
  },
]
