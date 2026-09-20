export interface GameModeDefinition {
  id: string
  name: string
  description: string
  bossWaveInterval: number
  spawnIntervalMultiplier: number
  enemyHealthMultiplier: number
  enemyDamageMultiplier: number
  playerDamageMultiplier: number
  scrapMultiplier: number
  /** When true, the run's seed is forced to a hash of today's UTC date instead of the player's seed input, so everyone gets the same run on the same day. */
  dailySeed: boolean
}

/** Rule-set presets picked on the loadout screen. GameEngine reads these once at construction. */
export const gameModes: GameModeDefinition[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'The default fight. No modifiers, boss every 5 waves.',
    bossWaveInterval: 5,
    spawnIntervalMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    playerDamageMultiplier: 1,
    scrapMultiplier: 1,
    dailySeed: false,
  },
  {
    id: 'blitz',
    name: 'Blitz',
    description: 'Enemies spawn 30% faster and a boss shows up every 3 waves. Short, frantic runs.',
    bossWaveInterval: 3,
    spawnIntervalMultiplier: 0.7,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    playerDamageMultiplier: 1,
    scrapMultiplier: 1,
    dailySeed: false,
  },
  {
    id: 'onslaught',
    name: 'Onslaught',
    description: 'Enemies hit 40% harder and carry 30% more health. Scrap payouts run 50% higher.',
    bossWaveInterval: 5,
    spawnIntervalMultiplier: 1,
    enemyHealthMultiplier: 1.3,
    enemyDamageMultiplier: 1.4,
    playerDamageMultiplier: 1,
    scrapMultiplier: 1.5,
    dailySeed: false,
  },
  {
    id: 'bossRush',
    name: 'Boss Rush',
    description: 'A boss joins the fight every 2 waves instead of every 5. No other modifiers.',
    bossWaveInterval: 2,
    spawnIntervalMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    playerDamageMultiplier: 1,
    scrapMultiplier: 1,
    dailySeed: false,
  },
  {
    id: 'bloodMoon',
    name: 'Blood Moon',
    description: 'Enemies swarm 25% faster and hit 50% harder, but carry 15% less health. Fast and vicious, not tanky.',
    bossWaveInterval: 5,
    spawnIntervalMultiplier: 0.75,
    enemyHealthMultiplier: 0.85,
    enemyDamageMultiplier: 1.5,
    playerDamageMultiplier: 1,
    scrapMultiplier: 1.2,
    dailySeed: false,
  },
  {
    id: 'glassCannon',
    name: 'Glass Cannon',
    description: 'You deal 50% more damage and take 60% more. Every fight is a duel.',
    bossWaveInterval: 5,
    spawnIntervalMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1.6,
    playerDamageMultiplier: 1.5,
    scrapMultiplier: 1.2,
    dailySeed: false,
  },
  {
    id: 'daily',
    name: 'Daily Nightfall',
    description: 'Standard rules, but the seed is locked to today (UTC). Same run for everyone, every day.',
    bossWaveInterval: 5,
    spawnIntervalMultiplier: 1,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    playerDamageMultiplier: 1,
    scrapMultiplier: 1,
    dailySeed: true,
  },
]

export const defaultGameMode = gameModes[0]

export function getGameMode(id: string): GameModeDefinition {
  return gameModes.find((m) => m.id === id) ?? defaultGameMode
}
