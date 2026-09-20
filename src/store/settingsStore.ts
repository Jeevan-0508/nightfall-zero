import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setMasterVolume as applyMasterVolume } from '../audio/soundEngine'

export type RebindableAction = 'up' | 'down' | 'left' | 'right' | 'dash' | 'grenade' | 'overcharge'

export const DEFAULT_KEYBINDS: Record<RebindableAction, string> = {
  up: 'KeyW',
  down: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  dash: 'ShiftLeft',
  grenade: 'KeyQ',
  overcharge: 'KeyE',
}

export function resolveKeybindConflict(
  current: Record<RebindableAction, string>,
  action: RebindableAction,
  code: string,
): Record<RebindableAction, string> {
  const conflictAction = (Object.keys(current) as RebindableAction[]).find(
    (a) => a !== action && current[a] === code,
  )
  if (conflictAction) {
    return { ...current, [action]: code, [conflictAction]: current[action] }
  }
  return { ...current, [action]: code }
}

interface SettingsStore {
  masterVolume: number
  setMasterVolume: (volume: number) => void
  reducedMotion: boolean
  setReducedMotion: (value: boolean) => void
  screenShakeIntensity: number
  setScreenShakeIntensity: (value: number) => void
  colorblindMode: boolean
  setColorblindMode: (value: boolean) => void
  keybinds: Record<RebindableAction, string>
  setKeybind: (action: RebindableAction, code: string) => void
  resetKeybinds: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      masterVolume: 0.35,
      setMasterVolume: (volume) => {
        const clamped = Math.max(0, Math.min(1, volume))
        applyMasterVolume(clamped)
        set({ masterVolume: clamped })
      },
      reducedMotion: false,
      setReducedMotion: (value) => set({ reducedMotion: value }),
      screenShakeIntensity: 1,
      setScreenShakeIntensity: (value) => set({ screenShakeIntensity: Math.max(0, Math.min(1.5, value)) }),
      colorblindMode: false,
      setColorblindMode: (value) => set({ colorblindMode: value }),
      keybinds: { ...DEFAULT_KEYBINDS },
      setKeybind: (action, code) => {
        set({ keybinds: resolveKeybindConflict(get().keybinds, action, code) })
      },
      resetKeybinds: () => set({ keybinds: { ...DEFAULT_KEYBINDS } }),
    }),
    {
      name: 'nightfall-zero-settings',
      onRehydrateStorage: () => (state) => {
        if (state) applyMasterVolume(state.masterVolume)
      },
    },
  ),
)
