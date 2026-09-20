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
  behavior: 'melee',
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
  behavior: 'melee',
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
  behavior: 'melee',
}

/** Keeps its distance and spits acid rounds instead of closing to melee range. */
export const spitter: EnemyDefinition = {
  id: 'spitter',
  name: 'Spitter',
  health: 30,
  speed: 60,
  contactDamage: 5,
  contactCooldown: 0.8,
  radius: 13,
  color: '#5bd9c9',
  xpValue: 16,
  behavior: 'ranged',
  preferredRange: 260,
  rangedDamage: 10,
  rangedCooldown: 1.6,
  rangedProjectileSpeed: 240,
}

/** Rushes fast and detonates for area damage on contact or death. */
export const exploder: EnemyDefinition = {
  id: 'exploder',
  name: 'Exploder',
  health: 26,
  speed: 110,
  contactDamage: 0,
  contactCooldown: 0.5,
  radius: 15,
  color: '#e0473a',
  xpValue: 18,
  behavior: 'melee',
  explosionDamage: 45,
  explosionRadius: 90,
}

/** Cloaks and dashes: untargetable while charging in, vulnerable while circling. */
export const stalker: EnemyDefinition = {
  id: 'stalker',
  name: 'Stalker',
  health: 55,
  speed: 95,
  contactDamage: 14,
  contactCooldown: 0.7,
  radius: 13,
  color: '#8a4fd8',
  xpValue: 22,
  behavior: 'stalker',
  visibleDuration: 2.2,
  cloakDuration: 1.0,
  cloakSpeedMultiplier: 2.6,
}

export const enemies: Record<string, EnemyDefinition> = {
  [walker.id]: walker,
  [runner.id]: runner,
  [brute.id]: brute,
  [spitter.id]: spitter,
  [exploder.id]: exploder,
  [stalker.id]: stalker,
}
