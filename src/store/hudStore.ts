import { create } from 'zustand'
import type { HudSnapshot } from '../game/engine/types'

const initialSnapshot: HudSnapshot = {
  status: 'playing',
  health: 100,
  maxHealth: 100,
  armor: 50,
  maxArmor: 100,
  ammoInMag: 30,
  magazineSize: 30,
  reloading: false,
  weaponName: 'Assault Rifle',
  waveNumber: 1,
  enemiesAlive: 0,
  xp: 0,
  xpToNext: 100,
  level: 1,
  survivalTime: 0,
  kills: 0,
}

interface HudStore {
  snapshot: HudSnapshot
  setSnapshot: (snapshot: HudSnapshot) => void
}

export const useHudStore = create<HudStore>((set) => ({
  snapshot: initialSnapshot,
  setSnapshot: (snapshot) => set({ snapshot }),
}))
