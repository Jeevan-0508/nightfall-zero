import { useHudStore } from '../../store/hudStore'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function HUD() {
  const snapshot = useHudStore((s) => s.snapshot)
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
        <div className="hud-level">LV {snapshot.level} &middot; {snapshot.kills} KILLS</div>
      </div>

      <div className="hud-xp-bar">
        <div className="hud-xp-fill" style={{ width: `${xpPct}%` }} />
      </div>

      {snapshot.boss && (
        <div className="hud-boss">
          <div className="hud-boss-name">
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
    </div>
  )
}
