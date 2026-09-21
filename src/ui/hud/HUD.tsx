import { useHudStore } from '../../store/hudStore'
import { useGameStore } from '../../store/gameStore'
import { ARENA_HEIGHT, ARENA_WIDTH } from '../../game/engine/types'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function HUD() {
  const snapshot = useHudStore((s) => s.snapshot)
  const debugPanelOpen = useGameStore((s) => s.debugPanelOpen)
  const healthPct = Math.max(0, (snapshot.health / snapshot.maxHealth) * 100)
  const armorPct = Math.max(0, (snapshot.armor / snapshot.maxArmor) * 100)
  const xpPct = Math.max(0, Math.min(100, (snapshot.xp / snapshot.xpToNext) * 100))

  return (
    <div className="hud">
      <div className="hud-top">
        <div className="hud-wave">
          WAVE {snapshot.waveNumber}
          <span className="hud-enemies">{snapshot.enemiesAlive} ENEMIES LEFT</span>
        </div>
        <div className="hud-timer">SURVIVED {formatTime(snapshot.survivalTime)}</div>
        <div className="hud-map">{snapshot.mapName.toUpperCase()} &middot; {snapshot.modeName.toUpperCase()}</div>
        <div className="hud-level">LV {snapshot.level} &middot; {snapshot.kills} KILLS</div>
        {snapshot.combo >= 2 && <div className="hud-combo">&times;{snapshot.combo} COMBO</div>}
        {snapshot.activeSynergies.length > 0 && (
          <div className="hud-synergy">{snapshot.activeSynergies.map((t) => t.toUpperCase()).join(' + ')} SYNERGY</div>
        )}
      </div>

      <div className="hud-minimap">
        {snapshot.radarBlips.map((blip) => (
          <div
            key={blip.id}
            className={`hud-minimap-blip${blip.boss ? ' hud-minimap-blip-boss' : ''}`}
            style={{ left: `${(blip.x / ARENA_WIDTH) * 100}%`, top: `${(blip.y / ARENA_HEIGHT) * 100}%` }}
          />
        ))}
        <div
          className="hud-minimap-player"
          style={{
            left: `${(snapshot.playerPosition.x / ARENA_WIDTH) * 100}%`,
            top: `${(snapshot.playerPosition.y / ARENA_HEIGHT) * 100}%`,
          }}
        />
      </div>

      <div className="hud-xp-bar">
        <div className="hud-xp-fill" style={{ width: `${xpPct}%` }} />
      </div>

      {snapshot.boss && (
        <div className={`hud-boss hud-boss-${snapshot.boss.stage}`}>
          <div className="hud-boss-name">
            {snapshot.boss.stage !== 'hunt' && (
              <span className="hud-boss-stage">{snapshot.boss.stage.toUpperCase()}</span>
            )}
            {snapshot.boss.name}
            {snapshot.boss.attackTelegraph && (
              <span className="hud-boss-telegraph">{snapshot.boss.attackTelegraph.toUpperCase()}</span>
            )}
          </div>
          <div className="hud-boss-bar">
            <div
              className="hud-boss-fill"
              style={{ width: `${Math.max(0, (snapshot.boss.health / snapshot.boss.maxHealth) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {snapshot.bossEntrance && (
        <div className="hud-boss-entrance">
          <div className="hud-boss-entrance-name">{snapshot.bossEntrance.name}</div>
          <div className="hud-boss-entrance-sub">APPROACHING</div>
        </div>
      )}

      <div className="hud-bottom">
        <div className="hud-left">
          <div className="hud-bars">
            <div className="hud-bar hud-bar-health">
              <div className="hud-bar-fill" style={{ width: `${healthPct}%` }} />
              <span className="hud-bar-label">{Math.ceil(snapshot.health)} / {snapshot.maxHealth}</span>
            </div>
            <div className="hud-bar hud-bar-armor">
              <div className="hud-bar-fill" style={{ width: `${armorPct}%` }} />
              <span className="hud-bar-label">{Math.ceil(snapshot.armor)} / {snapshot.maxArmor}</span>
            </div>
          </div>
          <div className="hud-abilities">
            {snapshot.abilities.map((ability) => {
              const fillPct = ability.cooldown > 0
                ? Math.max(0, Math.min(100, (1 - ability.cooldownRemaining / ability.cooldown) * 100))
                : 100
              return (
                <div
                  key={ability.id}
                  className={`hud-ability${ability.active ? ' hud-ability-active' : ''}`}
                >
                  <div className="hud-ability-fill" style={{ width: `${fillPct}%` }} />
                  <span className="hud-ability-key">{ability.key}</span>
                  <span className="hud-ability-name">{ability.name}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="hud-weapon">
          <span className="hud-weapon-name">{snapshot.weaponName}</span>
          <span className="hud-weapon-ammo">
            {snapshot.reloading ? 'RELOADING…' : `${snapshot.ammoInMag} / ${snapshot.magazineSize}`}
          </span>
        </div>
      </div>

      {debugPanelOpen && (
        <div className="hud-debug-panel">
          <div className="hud-debug-title">DIRECTOR</div>
          <div>intensity {snapshot.debug.intensity.toFixed(2)}{snapshot.debug.calmActive ? ' (relief)' : ''}</div>
          <div>profile {snapshot.debug.profile}</div>
          <div>move speed {snapshot.debug.avgMovementSpeed.toFixed(0)} px/s</div>
          <div>nearest enemy {snapshot.debug.avgNearestEnemyDistance.toFixed(0)} px</div>
          <div>edge distance {snapshot.debug.avgEdgeDistance.toFixed(0)} px</div>
          <div>accuracy {(snapshot.debug.accuracy * 100).toFixed(0)}%</div>
        </div>
      )}
    </div>
  )
}
