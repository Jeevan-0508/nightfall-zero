import type { EnemyDefinition } from '../game/engine/types'

export const walker: EnemyDefinition = {
  id: 'walker',
  name: 'Walker',
  health: 40,
  speed: 70,
  contactDamage: 8,
  contactCooldown: 0.6,
  radius: 14,
  color: '#8a9a5b',
  xpValue: 10,
}

export const runner: EnemyDefinition = {
  id: 'runner',
  name: 'Runner',
  health: 22,
  speed: 145,
  contactDamage: 6,
  contactCooldown: 0.5,
  radius: 11,
  color: '#d98c3d',
  xpValue: 12,
}

export const brute: EnemyDefinition = {
  id: 'brute',
  name: 'Brute',
  health: 140,
  speed: 45,
  contactDamage: 22,
  contactCooldown: 0.9,
  radius: 22,
  color: '#8b2c2c',
  xpValue: 30,
}

export const enemies: Record<string, EnemyDefinition> = {
  [walker.id]: walker,
  [runner.id]: runner,
  [brute.id]: brute,
}
