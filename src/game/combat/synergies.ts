export type UpgradeTheme = 'crit' | 'fire' | 'explosive' | 'mobility' | 'energy'

interface ThemedUpgrade {
  theme?: UpgradeTheme[]
}

/** Themes are earned two ways: taking an upgrade tagged with that theme, and
 * currently wielding the weapon that embodies it (flamethrower/rocket
 * launcher/energy weapon). Crit and mobility have no weapon tie-in, so they
 * stay active on any loadout once enough upgrades are taken; fire/explosive/
 * energy are weapon-identity themes and drop out the moment you switch off
 * that weapon, even though the upgrades themselves stay owned permanently. */
const WEAPON_THEME: Record<string, UpgradeTheme> = {
  flamethrower: 'fire',
  'rocket-launcher': 'explosive',
  'energy-weapon': 'energy',
}

export const SYNERGY_THRESHOLD = 3

export const CRIT_SYNERGY_DAMAGE_MULTIPLIER = 1.2
export const MOBILITY_SYNERGY_SPEED_MULTIPLIER = 1.15
export const FIRE_SYNERGY_BURN_MULTIPLIER = 1.5
export const EXPLOSIVE_SYNERGY_DAMAGE_MULTIPLIER = 1.25
export const EXPLOSIVE_SYNERGY_RADIUS_MULTIPLIER = 1.15
export const ENERGY_SYNERGY_PIERCE_BONUS = 1

export const EMPTY_THEME_STACKS: Record<UpgradeTheme, number> = {
  crit: 0,
  fire: 0,
  explosive: 0,
  mobility: 0,
  energy: 0,
}

/** Counts how many stacks of each theme the player currently has: one per
 * matching upgrade taken, plus one more if the equipped weapon embodies that
 * theme. Deterministic and cheap to recompute every frame from existing state
 * (chosen upgrades + equipped weapon id) rather than tracked separately. */
export function getThemeStacks(chosenUpgrades: ThemedUpgrade[], equippedWeaponId: string): Record<UpgradeTheme, number> {
  const stacks = { ...EMPTY_THEME_STACKS }
  for (const upgrade of chosenUpgrades) {
    for (const theme of upgrade.theme ?? []) {
      stacks[theme] += 1
    }
  }
  const weaponTheme = WEAPON_THEME[equippedWeaponId]
  if (weaponTheme) stacks[weaponTheme] += 1
  return stacks
}

export function isSynergyActive(stacks: Record<UpgradeTheme, number>, theme: UpgradeTheme): boolean {
  return stacks[theme] >= SYNERGY_THRESHOLD
}

export function getCritSynergyMultiplier(stacks: Record<UpgradeTheme, number>): number {
  return isSynergyActive(stacks, 'crit') ? CRIT_SYNERGY_DAMAGE_MULTIPLIER : 1
}

export function getMobilitySynergyMultiplier(stacks: Record<UpgradeTheme, number>): number {
  return isSynergyActive(stacks, 'mobility') ? MOBILITY_SYNERGY_SPEED_MULTIPLIER : 1
}

export function getFireSynergyMultiplier(stacks: Record<UpgradeTheme, number>): number {
  return isSynergyActive(stacks, 'fire') ? FIRE_SYNERGY_BURN_MULTIPLIER : 1
}

export function getExplosiveSynergyDamageMultiplier(stacks: Record<UpgradeTheme, number>): number {
  return isSynergyActive(stacks, 'explosive') ? EXPLOSIVE_SYNERGY_DAMAGE_MULTIPLIER : 1
}

export function getExplosiveSynergyRadiusMultiplier(stacks: Record<UpgradeTheme, number>): number {
  return isSynergyActive(stacks, 'explosive') ? EXPLOSIVE_SYNERGY_RADIUS_MULTIPLIER : 1
}

export function getEnergySynergyPierceBonus(stacks: Record<UpgradeTheme, number>): number {
  return isSynergyActive(stacks, 'energy') ? ENERGY_SYNERGY_PIERCE_BONUS : 0
}
