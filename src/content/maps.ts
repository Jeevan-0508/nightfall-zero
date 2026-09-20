import type { MapDefinition } from '../game/engine/types'
import type { Rng } from '../game/engine/rng'
import { rangeFloat } from '../game/engine/rng'

/** Four pillars in a diamond around the center, open lanes between them. */
export const crossroads: MapDefinition = {
  id: 'crossroads',
  name: 'Crossroads',
  obstacles: [
    { position: { x: 480, y: 180 }, radius: 28 },
    { position: { x: 480, y: 420 }, radius: 28 },
    { position: { x: 300, y: 300 }, radius: 28 },
    { position: { x: 660, y: 300 }, radius: 28 },
  ],
}

/** Two solid wall segments with a single chokepoint gap through the middle. */
export const bunker: MapDefinition = {
  id: 'bunker',
  name: 'Bunker',
  obstacles: [
    { position: { x: 200, y: 300 }, radius: 35 },
    { position: { x: 260, y: 300 }, radius: 35 },
    { position: { x: 320, y: 300 }, radius: 35 },
    { position: { x: 640, y: 300 }, radius: 35 },
    { position: { x: 700, y: 300 }, radius: 35 },
    { position: { x: 760, y: 300 }, radius: 35 },
  ],
}

/** Irregularly sized and placed rubble, no clean lanes. */
export const scatter: MapDefinition = {
  id: 'scatter',
  name: 'Scatter',
  obstacles: [
    { position: { x: 250, y: 180 }, radius: 30 },
    { position: { x: 700, y: 180 }, radius: 24 },
    { position: { x: 250, y: 430 }, radius: 24 },
    { position: { x: 700, y: 430 }, radius: 32 },
    { position: { x: 480, y: 140 }, radius: 20 },
    { position: { x: 480, y: 480 }, radius: 20 },
  ],
}

export const maps: MapDefinition[] = [crossroads, bunker, scatter]

export function pickMap(rng: Rng): MapDefinition {
  return maps[Math.floor(rangeFloat(rng, 0, maps.length))]
}
