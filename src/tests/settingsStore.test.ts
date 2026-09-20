import { describe, expect, it } from 'vitest'
import { DEFAULT_KEYBINDS, resolveKeybindConflict } from '../store/settingsStore'

describe('resolveKeybindConflict', () => {
  it('rebinds an action to a fresh, unused key with no side effects', () => {
    const result = resolveKeybindConflict(DEFAULT_KEYBINDS, 'dash', 'KeyF')
    expect(result.dash).toBe('KeyF')
    expect(result.up).toBe(DEFAULT_KEYBINDS.up)
  })

  it('swaps keys when the requested code is already bound to a different action', () => {
    const result = resolveKeybindConflict(DEFAULT_KEYBINDS, 'dash', DEFAULT_KEYBINDS.up)
    expect(result.dash).toBe(DEFAULT_KEYBINDS.up)
    expect(result.up).toBe(DEFAULT_KEYBINDS.dash)
  })

  it('is a no-op swap when rebinding an action to the key it already holds', () => {
    const result = resolveKeybindConflict(DEFAULT_KEYBINDS, 'up', DEFAULT_KEYBINDS.up)
    expect(result).toEqual(DEFAULT_KEYBINDS)
  })

  it('does not mutate the input map', () => {
    const before = { ...DEFAULT_KEYBINDS }
    resolveKeybindConflict(DEFAULT_KEYBINDS, 'dash', 'KeyF')
    expect(DEFAULT_KEYBINDS).toEqual(before)
  })
})
