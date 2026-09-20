import { create } from 'zustand'

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
  startRun: () => void
  endRun: (result: RunResult) => void
  returnToMenu: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  view: 'menu',
  runId: 0,
  lastResult: null,
  startRun: () => set((s) => ({ view: 'playing', runId: s.runId + 1, lastResult: null })),
  endRun: (result) => set({ view: 'gameover', lastResult: result }),
  returnToMenu: () => set({ view: 'menu' }),
}))
