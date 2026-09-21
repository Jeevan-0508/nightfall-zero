import { create } from 'zustand'
import type { HudSnapshot } from '../game/engine/types'

const initialSnapshot: HudSnapshot = {
  status: 'playing',
  activeSynergies: [],
  bossEntrance: null,
  health: 100,
  maxHealth: 100,
  armor: 50,
  maxArmor: 100,
  ammoInMag: 30,
  magazineSize: 30,
  reloading: false,
  weaponName: 'Assault Rifle',
  weaponIndex: 3,
  waveNumber: 1,
  enemiesAlive: 0,
  xp: 0,
  xpToNext: 100,
  level: 1,
  survivalTime: 0,
  kills: 0,
  abilities: [],
  boss: null,
  mapName: 'Crossroads',
  modeName: 'Standard',
  combo: 0,
  playerPosition: { x: 480, y: 300 },
  radarBlips: [],
  runEvent: null,
  eventToast: null,
  debug: {
    intensity: 0,
    calmActive: false,
    profile: 'balanced',
    weaponProfile: 'balanced',
    avgMovementSpeed: 0,
    avgNearestEnemyDistance: 0,
    avgEdgeDistance: 0,
    accuracy: 0,
  },
}

/** Dev-only frame/engine timing, read by the existing debug panel. Kept separate from
 * HudSnapshot (gameplay state) since this is purely a UI/rendering concern the engine has
 * no business knowing about. */
export interface PerfStats {
  fps: number
  engineMs: number
  renderMs: number
  enemyCount: number
  projectileCount: number
  particleCount: number
  hudHz: number
}

const initialPerf: PerfStats = {
  fps: 0,
  engineMs: 0,
  renderMs: 0,
  enemyCount: 0,
  projectileCount: 0,
  particleCount: 0,
  hudHz: 0,
}

interface HudStore {
  snapshot: HudSnapshot
  setSnapshot: (snapshot: HudSnapshot) => void
  perf: PerfStats
  setPerf: (perf: PerfStats) => void
}

export const useHudStore = create<HudStore>((set) => ({
  snapshot: initialSnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
  perf: initialPerf,
  setPerf: (perf) => set({ perf }),
}))
