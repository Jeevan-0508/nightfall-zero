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
  {
    waveNumber: 4,
    spawns: [
      { defId: 'walker', count: 4 },
      { defId: 'runner', count: 5 },
      { defId: 'brute', count: 2 },
      { defId: 'spitter', count: 3 },
    ],
    spawnIntervalMs: 620,
  },
  {
    waveNumber: 5,
    spawns: [
      { defId: 'walker', count: 4 },
      { defId: 'runner', count: 5 },
      { defId: 'brute', count: 2 },
      { defId: 'spitter', count: 3 },
      { defId: 'exploder', count: 3 },
    ],
    spawnIntervalMs: 600,
  },
  {
    waveNumber: 6,
    spawns: [
      { defId: 'walker', count: 4 },
      { defId: 'runner', count: 5 },
      { defId: 'brute', count: 3 },
      { defId: 'spitter', count: 3 },
      { defId: 'exploder', count: 3 },
      { defId: 'stalker', count: 2 },
    ],
    spawnIntervalMs: 580,
  },
]

// After the authored waves are cleared, escalate endlessly using wave 6's
// full roster, scaled by how many extra waves have passed.
export function generateEndlessWave(waveNumber: number): WaveDefinition {
  const extra = waveNumber - waves.length
  return {
    waveNumber,
    spawns: [
      { defId: 'walker', count: 4 + extra },
      { defId: 'runner', count: 5 + Math.floor(extra * 1.5) },
      { defId: 'brute', count: 3 + Math.floor(extra / 2) },
      { defId: 'spitter', count: 3 + Math.floor(extra / 2) },
      { defId: 'exploder', count: 3 + Math.floor(extra / 2) },
      { defId: 'stalker', count: 2 + Math.floor(extra / 3) },
    ],
    spawnIntervalMs: Math.max(280, 580 - extra * 30),
  }
}

export function getWaveDefinition(waveNumber: number): WaveDefinition {
  const authored = waves[waveNumber - 1]
  if (authored) return authored
  return generateEndlessWave(waveNumber)
}
