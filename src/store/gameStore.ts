import { create } from 'zustand'
import type { UpgradeOption } from '../content/upgrades'
import { assaultRifle } from '../content/weapons'
import { defaultGameMode } from '../content/gameModes'

export type GameView = 'menu' | 'loadout' | 'armory' | 'settings' | 'playing' | 'gameover'

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
  selectedModeId: string
  paused: boolean
  goToLoadout: () => void
  goToArmory: () => void
  goToSettings: () => void
  selectWeapon: (weaponId: string) => void
  selectMode: (modeId: string) => void
  setPaused: (paused: boolean) => void
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
  selectedModeId: defaultGameMode.id,
  paused: false,
  goToLoadout: () => set({ view: 'loadout' }),
  goToArmory: () => set({ view: 'armory' }),
  goToSettings: () => set({ view: 'settings' }),
  selectWeapon: (weaponId) => set({ selectedWeaponId: weaponId }),
  selectMode: (modeId) => set({ selectedModeId: modeId }),
  setPaused: (paused) => set({ paused }),
  startRun: () => set((s) => ({ view: 'playing', runId: s.runId + 1, lastResult: null, pendingUpgrades: null, paused: false })),
  endRun: (result) => set({ view: 'gameover', lastResult: result, pendingUpgrades: null, paused: false }),
  returnToMenu: () => set({ view: 'menu', paused: false }),
  setPendingUpgrades: (choices, onChoose) => {
    onChooseUpgrade = onChoose
    set({ pendingUpgrades: choices })
  },
  chooseUpgrade: (id) => {
    onChooseUpgrade?.(id)
    set({ pendingUpgrades: null })
  },
}))
