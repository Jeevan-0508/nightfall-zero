import type { Player } from '../game/engine/types'
import type { Rng } from '../game/engine/rng'
import { rangeFloat } from '../game/engine/rng'

export type UpgradeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface UpgradeOption {
  id: string
  name: string
  description: string
  rarity: UpgradeRarity
  apply: (player: Player) => void
}

/** Selection weight per rarity (higher = more likely) and the player level at which it starts appearing. */
const RARITY_WEIGHT: Record<UpgradeRarity, number> = { common: 100, rare: 45, epic: 20, legendary: 8 }
const RARITY_MIN_LEVEL: Record<UpgradeRarity, number> = { common: 1, rare: 2, epic: 4, legendary: 6 }

export const upgradePool: UpgradeOption[] = [
  {
    id: 'damage',
    name: 'Sharpened Rounds',
    description: '+15% weapon damage',
    rarity: 'common',
    apply: (p) => {
      p.upgrades.damageMultiplier *= 1.15
    },
  },
  {
    id: 'fireRate',
    name: 'Quickdraw',
    description: '+15% fire rate',
    rarity: 'common',
    apply: (p) => {
      p.upgrades.fireRateMultiplier *= 1.15
    },
  },
  {
    id: 'reload',
    name: 'Nimble Fingers',
    description: '+20% reload speed',
    rarity: 'common',
    apply: (p) => {
      p.upgrades.reloadSpeedMultiplier *= 1.2
    },
  },
  {
    id: 'crit',
    name: "Killer's Eye",
    description: '+8% critical chance',
    rarity: 'common',
    apply: (p) => {
      p.upgrades.critChanceBonus += 0.08
    },
  },
  {
    id: 'moveSpeed',
    name: 'Light Footwork',
    description: '+10% move speed',
    rarity: 'common',
    apply: (p) => {
      p.upgrades.moveSpeedMultiplier *= 1.1
    },
  },
  {
    id: 'maxHealth',
    name: 'Vitality',
    description: '+20 max health, healed on pickup',
    rarity: 'common',
    apply: (p) => {
      p.maxHealth += 20
      p.health += 20
    },
  },
  {
    id: 'maxArmor',
    name: 'Reinforced Plating',
    description: '+20 max armor, refilled on pickup',
    rarity: 'common',
    apply: (p) => {
      p.maxArmor += 20
      p.armor += 20
    },
  },
  {
    id: 'xpGain',
    name: "Scavenger's Instinct",
    description: '+15% XP gained',
    rarity: 'common',
    apply: (p) => {
      p.upgrades.xpGainMultiplier *= 1.15
    },
  },
  {
    id: 'twinBarrels',
    name: 'Twin Barrels',
    description: '+25% fire rate, +15% reload speed',
    rarity: 'rare',
    apply: (p) => {
      p.upgrades.fireRateMultiplier *= 1.25
      p.upgrades.reloadSpeedMultiplier *= 1.15
    },
  },
  {
    id: 'deepPockets',
    name: 'Deep Pockets',
    description: '+30 max health, +30 max armor, both refilled on pickup',
    rarity: 'rare',
    apply: (p) => {
      p.maxHealth += 30
      p.health += 30
      p.maxArmor += 30
      p.armor += 30
    },
  },
  {
    id: 'huntersInstinct',
    name: "Hunter's Instinct",
    description: '+15% critical chance, +15% move speed',
    rarity: 'rare',
    apply: (p) => {
      p.upgrades.critChanceBonus += 0.15
      p.upgrades.moveSpeedMultiplier *= 1.15
    },
  },
  {
    id: 'berserkerCore',
    name: 'Berserker Core',
    description: '+35% weapon damage, +20% fire rate',
    rarity: 'epic',
    apply: (p) => {
      p.upgrades.damageMultiplier *= 1.35
      p.upgrades.fireRateMultiplier *= 1.2
    },
  },
  {
    id: 'phantomStep',
    name: 'Phantom Step',
    description: '+25% move speed, +25% XP gained',
    rarity: 'epic',
    apply: (p) => {
      p.upgrades.moveSpeedMultiplier *= 1.25
      p.upgrades.xpGainMultiplier *= 1.25
    },
  },
  {
    id: 'deadEye',
    name: 'Dead Eye',
    description: '+25% critical chance, +75% critical damage',
    rarity: 'legendary',
    apply: (p) => {
      p.upgrades.critChanceBonus += 0.25
      p.upgrades.critDamageMultiplier *= 1.75
    },
  },
  {
    id: 'overclock',
    name: 'Overclock',
    description: '+50% fire rate, +25% reload speed, -10% weapon damage',
    rarity: 'legendary',
    apply: (p) => {
      p.upgrades.fireRateMultiplier *= 1.5
      p.upgrades.reloadSpeedMultiplier *= 1.25
      p.upgrades.damageMultiplier *= 0.9
    },
  },
]

/**
 * Weighted, level-gated, seeded pick: higher rarities are rarer and only start
 * appearing once the player has reached that rarity's minimum level, so a run's
 * upgrade choices stay reproducible for a given seed while still escalating
 * as the run goes on.
 */
export function pickUpgradeChoices(rng: Rng, playerLevel = 1, count = 3): UpgradeOption[] {
  const eligible = upgradePool.filter((o) => playerLevel >= RARITY_MIN_LEVEL[o.rarity])
  const remaining = [...eligible]
  const chosen: UpgradeOption[] = []

  for (let picks = 0; picks < count && remaining.length > 0; picks++) {
    const totalWeight = remaining.reduce((sum, o) => sum + RARITY_WEIGHT[o.rarity], 0)
    let roll = rangeFloat(rng, 0, totalWeight)
    let pickedIndex = remaining.length - 1
    for (let i = 0; i < remaining.length; i++) {
      roll -= RARITY_WEIGHT[remaining[i].rarity]
      if (roll <= 0) {
        pickedIndex = i
        break
      }
    }
    chosen.push(remaining[pickedIndex])
    remaining.splice(pickedIndex, 1)
  }

  return chosen
}
