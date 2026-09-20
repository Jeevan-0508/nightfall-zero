import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setMasterVolume as applyMasterVolume } from '../audio/soundEngine'

interface SettingsStore {
  masterVolume: number
  setMasterVolume: (volume: number) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      masterVolume: 0.35,
      setMasterVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume))
        applyMasterVolume(clamped)
        set({ masterVolume: clamped })
      },
    }),
    {
      name: 'nightfall-zero-settings',
      onRehydrateStorage: () => (state) => {
        if (state) applyMasterVolume(state.masterVolume)
      },
    },
  ),
)
