import type { WeaponDefinition } from '../game/engine/types'

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
}

export const weapons: Record<string, WeaponDefinition> = {
  [assaultRifle.id]: assaultRifle,
}
