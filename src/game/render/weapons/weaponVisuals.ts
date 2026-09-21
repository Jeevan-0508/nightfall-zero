/**
 * Per-weapon silhouette: barrel length/width and grip color, drawn in the caller's local
 * rotated space (+x = facing/aim). This is the piece that was actually missing before this
 * change - drawPlayer drew one fixed-size rectangle regardless of the equipped weapon. Tracer
 * style, muzzle-flash color, recoil strength, and firing rhythm were already weapon-specific
 * (WEAPON_TRACER_COLOR / WEAPON_MUZZLE_COLOR in particles.ts, weapon.recoil, weapon.fireRate) -
 * this table only adds the visible gun body, and reuses the same accent colors as the existing
 * muzzle-flash table so the whole weapon reads as one consistent object.
 */
export interface WeaponVisualSpec {
  barrelLength: number // px, from the grip to the muzzle tip
  barrelWidth: number // px
  gripLength: number // px, stubby receiver block behind the barrel
  bodyColor: string
  accentColor: string
}

const WEAPON_VISUALS: Record<string, WeaponVisualSpec> = {
  pistol: { barrelLength: 9, barrelWidth: 3.2, gripLength: 4, bodyColor: '#2b2f36', accentColor: '#fff2b0' },
  shotgun: { barrelLength: 15, barrelWidth: 5.5, gripLength: 6, bodyColor: '#3a2f22', accentColor: '#ffb04d' },
  smg: { barrelLength: 8, barrelWidth: 3, gripLength: 5, bodyColor: '#2f333a', accentColor: '#ffe28a' },
  'assault-rifle': { barrelLength: 14, barrelWidth: 3.6, gripLength: 5, bodyColor: '#33362f', accentColor: '#ffcf6a' },
  sniper: { barrelLength: 23, barrelWidth: 3, gripLength: 6, bodyColor: '#232a2e', accentColor: '#bfe3ff' },
  flamethrower: { barrelLength: 12, barrelWidth: 5, gripLength: 5, bodyColor: '#3a2318', accentColor: '#ff6a3d' },
  'rocket-launcher': { barrelLength: 17, barrelWidth: 7, gripLength: 7, bodyColor: '#2e3226', accentColor: '#ff8a3d' },
  'energy-weapon': { barrelLength: 13, barrelWidth: 4, gripLength: 5, bodyColor: '#1f3438', accentColor: '#5be3e3' },
}

export function getWeaponVisual(weaponId: string): WeaponVisualSpec {
  return WEAPON_VISUALS[weaponId] ?? WEAPON_VISUALS.pistol
}

/**
 * Draws the weapon silhouette anchored so its muzzle tip lands exactly at `muzzleDistance`
 * from the origin - the same offset GameEngine.updateWeapon() uses to spawn the real
 * projectile and muzzle-flash particle (player.radius + 6), so the visible gun's tip is never
 * just decorative, it is the authoritative firing point. `recoilKick` pulls the whole weapon
 * back toward the body for the few frames after firing (engine.recoilAmount decaying).
 */
export function drawWeapon(ctx: CanvasRenderingContext2D, weaponId: string, muzzleDistance: number, recoilKick: number): void {
  const spec = getWeaponVisual(weaponId)
  const tipX = muzzleDistance - recoilKick
  const barrelStartX = tipX - spec.barrelLength

  ctx.save()
  ctx.fillStyle = spec.bodyColor
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(barrelStartX, -spec.barrelWidth / 2, spec.barrelLength, spec.barrelWidth, spec.barrelWidth * 0.3)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.fillStyle = spec.accentColor
  ctx.globalAlpha = 0.85
  ctx.roundRect(
    barrelStartX - spec.gripLength,
    -spec.barrelWidth * 0.4,
    spec.gripLength,
    spec.barrelWidth * 0.8,
    spec.barrelWidth * 0.2,
  )
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.restore()
}
