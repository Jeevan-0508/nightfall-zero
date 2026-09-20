import { create } from 'zustand'
import type { UpgradeOption } from '../content/upgrades'
import { assaultRifle } from '../content/weapons'

export type GameView = 'menu' | 'loadout' | 'armory' | 'playing' | 'gameover'

export interface RunResult {
  survivalTime: number
  kills: number
  waveReached: number
}

interface GameStore {
  view: GameView
  runId: number
  lastResult: RunResult | null
  pendingUpgrades: UpgradeOption[] | null
  selectedWeaponId: string
  goToLoadout: () => void
  goToArmory: () => void
  selectWeapon: (weaponId: string) => void
  startRun: () => void
  endRun: (result: RunResult) => void
  returnToMenu: () => void
  setPendingUpgrades: (choices: UpgradeOption[] | null, onChoose: ((id: string) => void) | null) => void
  chooseUpgrade: (id: string) => void
}

let onChooseUpgrade: ((id: string) => void) | null = null

export const useGameStore = create<GameStore>((set) => ({
  view: 'menu',
  runId: 0,
  lastResult: null,
  pendingUpgrades: null,
  selectedWeaponId: assaultRifle.id,
  goToLoadout: () => set({ view: 'loadout' }),
  goToArmory: () => set({ view: 'armory' }),
  selectWeapon: (weaponId) => set({ selectedWeaponId: weaponId }),
  startRun: () => set((s) => ({ view: 'playing', runId: s.runId + 1, lastResult: null, pendingUpgrades: null })),
  endRun: (result) => set({ view: 'gameover', lastResult: result, pendingUpgrades: null }),
  returnToMenu: () => set({ view: 'menu' }),
  setPendingUpgrades: (choices, onChoose) => {
    onChooseUpgrade = onChoose
    set({ pendingUpgrades: choices })
  },
  chooseUpgrade: (id) => {
    onChooseUpgrade?.(id)
    set({ pendingUpgrades: null })
  },
}))
