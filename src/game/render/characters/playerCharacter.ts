import { MUZZLE_OFFSET, type GameEngine } from '../../engine/GameEngine'
import { breathe, getPlayerAnimState, strideAmplitude, walkPhase } from '../animation/animation'
import { defaultHumanoidSpec, drawGlowDot, drawHumanoid } from './composer'
import { drawWeapon } from '../weapons/weaponVisuals'

/**
 * THE SURVIVOR: a hardened top-down combat character - tactical jacket torso, helmet-toned
 * head with a glowing visor slit, a small backpack silhouette, and the actual equipped weapon
 * (not a generic rectangle) extending from the body toward the aim direction. Replaces the
 * single flat-color circle-plus-rectangle the player used to be drawn as.
 */
export function drawPlayerCharacter(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  const { position, rotation, radius, health, maxHealth } = engine.player
  const anim = getPlayerAnimState(engine)
  const isDead = anim.pose === 'death'
  const recoilOffset = engine.recoilAmount
  const drawX = position.x - Math.cos(rotation) * recoilOffset
  const drawY = position.y - Math.sin(rotation) * recoilOffset
  const healthRatio = maxHealth > 0 ? health / maxHealth : 1
  const statusColor = isDead ? '#4a4a4a' : healthRatio > 0.5 ? '#3fd8a0' : healthRatio > 0.25 ? '#e0b23a' : '#e0473a'
  const t = engine.stats.survivalTime

  // Ambient status aura + reload progress ring, drawn in world space at the character's real
  // position (not the recoil-shifted draw position) - unchanged from before this pass.
  ctx.save()
  ctx.translate(position.x, position.y)
  const auraPulse = isDead ? 0 : 0.6 + Math.sin(t * 3) * 0.4
  ctx.beginPath()
  ctx.arc(0, 0, radius + 7, 0, Math.PI * 2)
  ctx.strokeStyle = statusColor
  ctx.globalAlpha = 0.18 + auraPulse * 0.12
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.globalAlpha = 1

  const equippedState = engine.player.weapons[engine.player.equippedWeaponId]
  if (equippedState.reloading) {
    const progress = 1 - equippedState.reloadRemaining / engine.weaponDef.reloadTime
    ctx.beginPath()
    ctx.arc(0, 0, radius + 11, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
    ctx.strokeStyle = '#4f8cff'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  if (anim.pose === 'ability') {
    const pulse = 0.5 + Math.sin(t * 8) * 0.5
    ctx.beginPath()
    ctx.arc(0, 0, radius + 9 + pulse * 3, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(120, 220, 255, ${0.4 + pulse * 0.3})`
    ctx.lineWidth = 2.5
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.translate(drawX, drawY)
  ctx.rotate(rotation)

  ctx.beginPath()
  ctx.ellipse(2, radius * 0.6, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fill()

  const hitPulse = isDead ? 0 : engine.playerHitFlash / 0.16
  const breathBob = isDead ? 0 : breathe(t) * 0.6
  const squash = isDead ? 0.55 : 1
  ctx.scale(1, squash)

  const spec = defaultHumanoidSpec(radius, isDead ? '#3a3a3a' : hitPulse > 0.5 ? '#e6e9ee' : '#4a5c52')
  spec.headScale = 0.36
  spec.headForward = 0.66 + breathBob * 0.02
  spec.torsoWidthRatio = 0.6
  spec.torsoLengthRatio = 0.56
  spec.limbLengthRatio = 0.85
  spec.strideAmplitude = isDead ? 0 : strideAmplitude(anim.speedRatio)
  spec.walkPhase = walkPhase(t, anim.speedRatio)

  const headColor = isDead ? '#5a5a5a' : hitPulse > 0.5 ? '#ffffff' : '#8a97a3'
  const { head } = drawHumanoid(ctx, spec, headColor)

  if (!isDead) {
    // Compact backpack silhouette, opposite the facing direction - one of the "recognizable
    // survivor" cues the flat circle body never had room for.
    ctx.save()
    ctx.fillStyle = 'rgba(18, 24, 32, 0.92)'
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(-radius * 0.98, -radius * 0.32, radius * 0.5, radius * 0.64, radius * 0.16)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    drawGlowDot(ctx, head.x + head.r * 0.32, head.y, head.r * 0.22, '#7fe9ff', 6)

    const recoilKick = Math.min(6, engine.recoilAmount * 0.3)
    drawWeapon(ctx, engine.player.equippedWeaponId, radius + MUZZLE_OFFSET, recoilKick)
  } else {
    ctx.strokeStyle = '#8a8a8a'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-radius * 0.4, 0)
    ctx.lineTo(radius * 0.4, 0)
    ctx.stroke()
  }

  ctx.restore()
}
