export interface GameModeDefinition {
  id: string
  name: string
  description: string
  bossWaveInterval: number
  spawnIntervalMultiplier: number
  enemyHealthMultiplier: number
  enemyDamageMultiplier: number
  scrapMultiplier: number
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
    scrapMultiplier: 1,
  },
  {
    id: 'blitz',
    name: 'Blitz',
    description: 'Enemies spawn 30% faster and a boss shows up every 3 waves. Short, frantic runs.',
    bossWaveInterval: 3,
    spawnIntervalMultiplier: 0.7,
    enemyHealthMultiplier: 1,
    enemyDamageMultiplier: 1,
    scrapMultiplier: 1,
  },
  {
    id: 'onslaught',
    name: 'Onslaught',
    description: 'Enemies hit 40% harder and carry 30% more health. Scrap payouts run 50% higher.',
    bossWaveInterval: 5,
    spawnIntervalMultiplier: 1,
    enemyHealthMultiplier: 1.3,
    enemyDamageMultiplier: 1.4,
    scrapMultiplier: 1.5,
  },
]

export const defaultGameMode = gameModes[0]

export function getGameMode(id: string): GameModeDefinition {
  return gameModes.find((m) => m.id === id) ?? defaultGameMode
}
