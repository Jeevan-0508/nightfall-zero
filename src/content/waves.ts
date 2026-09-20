import type { WaveDefinition } from '../game/engine/types'

export const waves: WaveDefinition[] = [
  {
    waveNumber: 1,
    spawns: [{ defId: 'walker', count: 6 }],
    spawnIntervalMs: 900,
  },
  {
    waveNumber: 2,
    spawns: [
      { defId: 'walker', count: 6 },
      { defId: 'runner', count: 4 },
    ],
    spawnIntervalMs: 750,
  },
  {
    waveNumber: 3,
    spawns: [
      { defId: 'walker', count: 5 },
      { defId: 'runner', count: 6 },
      { defId: 'brute', count: 2 },
    ],
    spawnIntervalMs: 650,
  },
]

// After the authored waves are cleared, escalate endlessly using wave 3's
// composition ratio scaled by how many extra waves have passed.
export function generateEndlessWave(waveNumber: number): WaveDefinition {
  const extra = waveNumber - waves.length
  return {
    waveNumber,
    spawns: [
      { defId: 'walker', count: 5 + extra },
      { defId: 'runner', count: 6 + Math.floor(extra * 1.5) },
      { defId: 'brute', count: 2 + Math.floor(extra / 2) },
    ],
    spawnIntervalMs: Math.max(300, 650 - extra * 40),
  }
}

export function getWaveDefinition(waveNumber: number): WaveDefinition {
  const authored = waves[waveNumber - 1]
  if (authored) return authored
  return generateEndlessWave(waveNumber)
}
