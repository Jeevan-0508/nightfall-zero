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

/**
 * Spawns every 5th wave alongside the normal roster. Cycles slam -> charge ->
 * barrage on a fixed rotation, each attack telegraphed first so it is always
 * dodgeable, never a surprise one-shot.
 */
export const overlord: EnemyDefinition = {
  id: 'overlord',
  name: 'Overlord',
  health: 600,
  speed: 55,
  contactDamage: 16,
  contactCooldown: 0.5,
  radius: 30,
  color: '#c9a227',
  xpValue: 150,
  behavior: 'boss',
  bossAttackInterval: 3.5,
  bossTelegraphDuration: 0.6,
  bossSlamDamage: 24,
  bossSlamRadius: 110,
  bossChargeSpeedMultiplier: 3.2,
  bossChargeDuration: 0.45,
  bossBarrageCount: 7,
  bossBarrageDamage: 9,
  bossBarrageProjectileSpeed: 230,
}

/**
 * The second boss encounter. Same telegraph -> attack -> cooldown state machine as the
 * Overlord, tuned as a glass cannon: less health, a faster attack tempo, a shorter
 * telegraph window, and a harder-hitting charge and barrage. Alternates with the
 * Overlord every boss wave.
 */
export const executioner: EnemyDefinition = {
  id: 'executioner',
  name: 'Executioner',
  health: 420,
  speed: 65,
  contactDamage: 20,
  contactCooldown: 0.5,
  radius: 26,
  color: '#c94a27',
  xpValue: 170,
  behavior: 'boss',
  bossAttackInterval: 2.6,
  bossTelegraphDuration: 0.45,
  bossSlamDamage: 20,
  bossSlamRadius: 90,
  bossChargeSpeedMultiplier: 4.0,
  bossChargeDuration: 0.35,
  bossBarrageCount: 5,
  bossBarrageDamage: 12,
  bossBarrageProjectileSpeed: 260,
}

export const enemies: Record<string, EnemyDefinition> = {
  [walker.id]: walker,
  [runner.id]: runner,
  [brute.id]: brute,
  [spitter.id]: spitter,
  [exploder.id]: exploder,
  [stalker.id]: stalker,
  [overlord.id]: overlord,
  [executioner.id]: executioner,
}
