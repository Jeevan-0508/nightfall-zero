import { GameEngine } from './GameEngine'
import { startWave } from '../waves/waveManager'
import { maps } from '../../content/maps'
import { upgradePool, type UpgradeOption } from '../../content/upgrades'
import type { DirectorState } from '../director/director'
import type { TelemetryState } from '../director/telemetry'
import { createRunEventState } from '../events/runEvents'
import type { EngineStats, Player } from './types'

const STORAGE_KEY = 'nightfall-zero-run-save'
const SAVE_VERSION = 1

/**
 * A checkpoint, not a byte-perfect freeze-frame: mid-wave enemies, in-flight projectiles/
 * particles, and any run event in progress are deliberately dropped. Resuming restarts the
 * saved wave from its top via the same startWave() the engine itself calls on every wave
 * transition, so the player, their upgrades, XP, and overall progress all come back exactly as
 * they were - only "how far into the current wave" is lost. That trade is what keeps this a
 * ~40-line module instead of a full struct-of-arrays snapshot of every live entity.
 */
export interface RunSaveData {
  version: number
  savedAt: number
  seed: number
  startingWeaponId: string
  gameModeId: string
  mapId: string
  waveIndex: number
  player: Player
  stats: EngineStats
  telemetry: TelemetryState
  director: DirectorState
  chosenUpgradeIds: string[]
}

export function serializeRun(engine: GameEngine): RunSaveData {
  return {
    version: SAVE_VERSION,
    savedAt: Date.now(),
    seed: engine.seed,
    startingWeaponId: engine.player.equippedWeaponId,
    gameModeId: engine.mode.id,
    mapId: engine.map.id,
    waveIndex: engine.wave.waveIndex,
    player: structuredClone(engine.player),
    stats: { ...engine.stats },
    telemetry: structuredClone(engine.telemetry),
    director: { ...engine.director },
    chosenUpgradeIds: engine.chosenUpgrades.map((u) => u.id),
  }
}

export function restoreRun(data: RunSaveData): GameEngine {
  const engine = new GameEngine(data.seed, data.startingWeaponId, {}, data.gameModeId)
  engine.map = maps.find((m) => m.id === data.mapId) ?? engine.map
  engine.player = structuredClone(data.player)
  engine.stats = { ...data.stats }
  engine.telemetry = structuredClone(data.telemetry)
  engine.director = { ...data.director }
  engine.runEvents = createRunEventState()
  engine.chosenUpgrades = data.chosenUpgradeIds
    .map((id) => upgradePool.find((u) => u.id === id))
    .filter((u): u is UpgradeOption => u !== undefined)
  engine.enemyList = []
  startWave(engine.wave, data.waveIndex)
  return engine
}

export function saveRunToStorage(engine: GameEngine): void {
  try {
    if (engine.status !== 'playing') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeRun(engine)))
  } catch {
    // localStorage can be unavailable (private browsing, quota) - losing autosave is not fatal
  }
}

export function loadRunFromStorage(): RunSaveData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as RunSaveData
    if (parsed.version !== SAVE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function clearRunFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // nothing to clean up if storage isn't available in the first place
  }
}
