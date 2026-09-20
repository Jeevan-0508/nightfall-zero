import type { Player } from '../game/engine/types'
import type { Rng } from '../game/engine/rng'

export interface UpgradeOption {
  id: string
  name: string
  description: string
  apply: (player: Player) => void
}

export const upgradePool: UpgradeOption[] = [
  {
    id: 'damage',
    name: 'Sharpened Rounds',
    description: '+15% weapon damage',
    apply: (p) => {
      p.upgrades.damageMultiplier *= 1.15
    },
  },
  {
    id: 'fireRate',
    name: 'Quickdraw',
    description: '+15% fire rate',
    apply: (p) => {
      p.upgrades.fireRateMultiplier *= 1.15
    },
  },
  {
    id: 'reload',
    name: 'Nimble Fingers',
    description: '+20% reload speed',
    apply: (p) => {
      p.upgrades.reloadSpeedMultiplier *= 1.2
    },
  },
  {
    id: 'crit',
    name: "Killer's Eye",
    description: '+8% critical chance',
    apply: (p) => {
      p.upgrades.critChanceBonus += 0.08
    },
  },
  {
    id: 'moveSpeed',
    name: 'Light Footwork',
    description: '+10% move speed',
    apply: (p) => {
      p.upgrades.moveSpeedMultiplier *= 1.1
    },
  },
  {
    id: 'maxHealth',
    name: 'Vitality',
    description: '+20 max health, healed on pickup',
    apply: (p) => {
      p.maxHealth += 20
      p.health += 20
    },
  },
  {
    id: 'maxArmor',
    name: 'Reinforced Plating',
    description: '+20 max armor, refilled on pickup',
    apply: (p) => {
      p.maxArmor += 20
      p.armor += 20
    },
  },
  {
    id: 'xpGain',
    name: "Scavenger's Instinct",
    description: '+15% XP gained',
    apply: (p) => {
      p.upgrades.xpGainMultiplier *= 1.15
    },
  },
]

/** Fisher-Yates shuffle via the seeded RNG, so a run's upgrade choices replay exactly. */
export function pickUpgradeChoices(rng: Rng, count = 3): UpgradeOption[] {
  const pool = [...upgradePool]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}
