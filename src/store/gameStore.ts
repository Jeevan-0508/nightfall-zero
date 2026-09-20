import { create } from 'zustand'
import type { UpgradeOption } from '../content/upgrades'

export type GameView = 'menu' | 'playing' | 'gameover'

interface RunResult {
  survivalTime: number
  kills: number
  waveReached: number
}

interface GameStore {
  view: GameView
  runId: number
  lastResult: RunResult | null
  pendingUpgrades: UpgradeOption[] | null
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
