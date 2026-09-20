import type { WeaponDefinition } from '../game/engine/types'

export const pistol: WeaponDefinition = {
  id: 'pistol',
  name: 'Pistol',
  damage: 18,
  fireRate: 3.5,
  magazineSize: 12,
  reloadTime: 1.1,
  bulletSpeed: 950,
  spread: 0.02,
  range: 480,
  criticalChance: 0.15,
  criticalMultiplier: 2.2,
  recoil: 3,
  pellets: 1,
}

export const shotgun: WeaponDefinition = {
  id: 'shotgun',
  name: 'Shotgun',
  damage: 9,
  fireRate: 1.1,
  magazineSize: 6,
  reloadTime: 2.2,
  bulletSpeed: 700,
  spread: 0.28,
  range: 260,
  criticalChance: 0.05,
  criticalMultiplier: 2,
  recoil: 12,
  pellets: 6,
}

export const smg: WeaponDefinition = {
  id: 'smg',
  name: 'SMG',
  damage: 7,
  fireRate: 15,
  magazineSize: 45,
  reloadTime: 1.6,
  bulletSpeed: 850,
  spread: 0.09,
  range: 380,
  criticalChance: 0.08,
  criticalMultiplier: 1.8,
  recoil: 2,
  pellets: 1,
}

export const assaultRifle: WeaponDefinition = {
  id: 'assault-rifle',
  name: 'Assault Rifle',
  damage: 12,
  fireRate: 9,
  magazineSize: 30,
  reloadTime: 1.8,
  bulletSpeed: 900,
  spread: 0.045,
  range: 520,
  criticalChance: 0.1,
  criticalMultiplier: 2,
  recoil: 4,
  pellets: 1,
}

export const sniper: WeaponDefinition = {
  id: 'sniper',
  name: 'Sniper',
  damage: 85,
  fireRate: 0.9,
  magazineSize: 5,
  reloadTime: 2.6,
  bulletSpeed: 1400,
  spread: 0.005,
  range: 900,
  criticalChance: 0.35,
  criticalMultiplier: 2.5,
  recoil: 14,
  pellets: 1,
}

export const flamethrower: WeaponDefinition = {
  id: 'flamethrower',
  name: 'Flamethrower',
  damage: 4,
  fireRate: 22,
  magazineSize: 120,
  reloadTime: 2.8,
  bulletSpeed: 380,
  spread: 0.3,
  range: 150,
  criticalChance: 0.02,
  criticalMultiplier: 1.5,
  recoil: 1,
  pellets: 1,
}

export const rocketLauncher: WeaponDefinition = {
  id: 'rocket-launcher',
  name: 'Rocket Launcher',
  damage: 70,
  fireRate: 0.6,
  magazineSize: 4,
  reloadTime: 2.4,
  bulletSpeed: 480,
  spread: 0.01,
  range: 620,
  criticalChance: 0.05,
  criticalMultiplier: 1.8,
  recoil: 20,
  pellets: 1,
  explosionRadius: 90,
}

export const energyWeapon: WeaponDefinition = {
  id: 'energy-weapon',
  name: 'Energy Weapon',
  damage: 16,
  fireRate: 6,
  magazineSize: 24,
  reloadTime: 1.6,
  bulletSpeed: 1000,
  spread: 0.03,
  range: 560,
  criticalChance: 0.12,
  criticalMultiplier: 2,
  recoil: 3,
  pellets: 1,
  pierceCount: 2,
}

// Digit-key 1-8 order, matching the loadout mock's weapon rack layout.
export const weaponOrder: WeaponDefinition[] = [
  pistol,
  shotgun,
  smg,
  assaultRifle,
  sniper,
  flamethrower,
  rocketLauncher,
  energyWeapon,
]

export const weapons: Record<string, WeaponDefinition> = weaponOrder.reduce(
  (acc, def) => {
    acc[def.id] = def
    return acc
  },
  {} as Record<string, WeaponDefinition>,
)
