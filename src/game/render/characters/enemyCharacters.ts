import type { Enemy, EnemyDefinition } from '../../engine/types'
import { isSpitterTelegraphing, isStrideImpactBeat } from '../animation/animation'
import { defaultHumanoidSpec, drawGlowDot, drawHumanoid, type HumanoidDrawResult } from './composer'

export interface EnemyAnimInputs {
  t: number
  walkPhase: number
  strideAmplitude: number
  speedRatio: number
}

/** Two small glow dots at the head anchor, in the caller's already-rotated local space -
 * replaces the old drawEyes(), which recomputed its own forward offset from `facing` in the
 * unrotated frame and could drift from wherever the head actually ended up. */
export function drawEyesAtHead(ctx: CanvasRenderingContext2D, head: { x: number; y: number; r: number }, color: string): void {
  const spread = head.r * 0.5
  for (const side of [-1, 1]) {
    drawGlowDot(ctx, head.x + head.r * 0.25, head.y + side * spread, head.r * 0.16, color, 5)
  }
}

function drawWalker(ctx: CanvasRenderingContext2D, def: EnemyDefinition, color: string, a: EnemyAnimInputs): HumanoidDrawResult {
  const spec = defaultHumanoidSpec(def.radius, color)
  spec.hunch = 0.6
  spec.jagged = true
  spec.torsoWidthRatio = 0.72
  spec.torsoLengthRatio = 0.76
  spec.headScale = 0.38
  spec.strideAmplitude = a.strideAmplitude * 0.7
  spec.walkPhase = a.walkPhase * 0.6
  return drawHumanoid(ctx, spec, color)
}

function drawRunner(ctx: CanvasRenderingContext2D, def: EnemyDefinition, color: string, a: EnemyAnimInputs): HumanoidDrawResult {
  const spec = defaultHumanoidSpec(def.radius, color)
  spec.hunch = 0.5
  spec.torsoWidthRatio = 0.42
  spec.torsoLengthRatio = 0.88
  spec.limbLengthRatio = 1.15
  spec.headScale = 0.34
  spec.strideAmplitude = a.strideAmplitude
  spec.walkPhase = a.walkPhase * 1.6

  if (a.speedRatio > 0.6) {
    ctx.save()
    ctx.globalAlpha *= 0.22
    ctx.beginPath()
    ctx.ellipse(-def.radius * 0.95, 0, def.radius * 0.55, def.radius * 0.32, 0, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.restore()
  }
  return drawHumanoid(ctx, spec, color)
}

function drawSpitter(ctx: CanvasRenderingContext2D, enemy: Enemy, def: EnemyDefinition, color: string, a: EnemyAnimInputs): HumanoidDrawResult {
  const spec = defaultHumanoidSpec(def.radius, color)
  spec.hunch = 0.35
  spec.headScale = 0.6
  spec.headForward = 0.6
  spec.torsoWidthRatio = 0.6
  spec.strideAmplitude = a.strideAmplitude * 0.5
  spec.walkPhase = a.walkPhase
  const result = drawHumanoid(ctx, spec, color)

  const telegraphing = isSpitterTelegraphing(enemy)
  const pulse = 0.5 + Math.sin(a.t * (telegraphing ? 22 : 5)) * 0.5
  const glowColor = telegraphing ? '#e6fff5' : '#5bd9c9'
  drawGlowDot(ctx, result.head.x, result.head.y, result.head.r * (telegraphing ? 0.55 + pulse * 0.25 : 0.3), glowColor, telegraphing ? 11 : 5)
  return result
}

function drawBrute(ctx: CanvasRenderingContext2D, enemy: Enemy, def: EnemyDefinition, color: string, a: EnemyAnimInputs): HumanoidDrawResult {
  const spec = defaultHumanoidSpec(def.radius, color)
  spec.hunch = 0.25
  spec.torsoWidthRatio = 0.95
  spec.torsoLengthRatio = 0.7
  spec.headScale = 0.3
  spec.limbLengthRatio = 1.1
  spec.strideAmplitude = a.strideAmplitude * 0.8
  spec.walkPhase = a.walkPhase * 0.5
  const result = drawHumanoid(ctx, spec, color)

  // Armor cracks scale with damage taken so far, deterministic per-enemy (seeded off its id)
  // so they don't jitter frame to frame - visual damage storytelling beyond the health bar.
  const healthRatio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1
  const crackCount = Math.round((1 - healthRatio) * 4)
  if (crackCount > 0) {
    ctx.save()
    ctx.strokeStyle = 'rgba(15, 12, 8, 0.65)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < crackCount; i++) {
      const seed = enemy.id * 13 + i * 47
      const angle = (seed % 360) * (Math.PI / 180)
      const len = def.radius * (0.5 + (seed % 5) / 10)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len)
      ctx.stroke()
    }
    ctx.restore()
  }

  if (isStrideImpactBeat(spec.walkPhase, spec.strideAmplitude)) {
    ctx.save()
    ctx.globalAlpha *= 0.45
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(-def.radius * 0.3, 0, def.radius * 0.65, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  return result
}

/** Non-humanoid: a swollen, veined, pulsing bio-bomb. No head/eyes, so callers should skip
 * eye-drawing for this one - matches the spec's "walking biological bomb" concept exactly. */
function drawExploder(ctx: CanvasRenderingContext2D, enemy: Enemy, def: EnemyDefinition, color: string, a: EnemyAnimInputs): void {
  const healthRatio = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 1
  const instability = 1 - healthRatio
  const pulse = 0.5 + Math.sin(a.t * (6 + instability * 10)) * 0.5

  ctx.beginPath()
  ctx.fillStyle = color
  ctx.arc(0, 0, def.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.strokeStyle = `rgba(255, ${Math.round(120 - instability * 60)}, ${Math.round(60 - instability * 30)}, 0.7)`
  ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const seed = enemy.id * 7 + i * 31
    const angle = (seed % 360) * (Math.PI / 180)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(angle) * def.radius * 0.9, Math.sin(angle) * def.radius * 0.9)
    ctx.stroke()
  }

  const coreR = def.radius * (0.45 + pulse * 0.15 * (0.5 + instability))
  drawGlowDot(ctx, 0, 0, coreR, `rgba(255, ${Math.round(210 - instability * 140)}, 80, ${0.7 + pulse * 0.3})`, 6 + instability * 10)
}

function drawStalker(ctx: CanvasRenderingContext2D, enemy: Enemy, def: EnemyDefinition, color: string, a: EnemyAnimInputs): HumanoidDrawResult {
  const spec = defaultHumanoidSpec(def.radius, color)
  spec.torsoWidthRatio = 0.45
  spec.torsoLengthRatio = 0.82
  spec.headScale = 0.36
  spec.strideAmplitude = a.strideAmplitude
  spec.walkPhase = a.walkPhase * 1.3
  spec.alphaMultiplier = enemy.cloaked ? 1 : 0.72

  if (!enemy.cloaked) {
    // Cheap distortion cue: a faint offset ghost of the same silhouette, standing in for a
    // proper shader-based distortion effect at a fraction of the render cost.
    ctx.save()
    ctx.globalAlpha *= 0.16
    ctx.translate(1.6, 0.9)
    drawHumanoid(ctx, spec, color)
    ctx.restore()
  }
  return drawHumanoid(ctx, spec, color)
}

function drawBoss(ctx: CanvasRenderingContext2D, enemy: Enemy, def: EnemyDefinition, color: string, a: EnemyAnimInputs): HumanoidDrawResult {
  const spec = defaultHumanoidSpec(def.radius, color)
  spec.torsoWidthRatio = 0.9
  spec.torsoLengthRatio = 0.85
  spec.headScale = 0.32
  spec.limbLengthRatio = 1.2
  spec.strideAmplitude = a.strideAmplitude * 0.6
  spec.walkPhase = a.walkPhase * 0.4
  const result = drawHumanoid(ctx, spec, color)

  // Trailing armor-plate section behind the core body - a second silhouette mass so the boss
  // reads as multi-part, not just "a bigger enemy."
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(-def.radius * 0.55, 0, def.radius * 0.55, def.radius * 0.42, 0, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // Weak points: count and glow color escalate with bossStage (hunt -> control -> enraged),
  // reusing the existing stage field so "armor breaking away to expose glowing mutations"
  // needs zero new engine state.
  const weakPointCount = enemy.bossStage === 'enraged' ? 4 : enemy.bossStage === 'control' ? 2 : 1
  const glowColor = enemy.bossStage === 'enraged' ? '#ff5a3d' : enemy.bossStage === 'control' ? '#ffb04d' : '#ffe28a'
  const pulse = 0.5 + Math.sin(a.t * 6) * 0.5
  for (let i = 0; i < weakPointCount; i++) {
    const seed = enemy.id * 11 + i * 29
    const angle = (seed % 360) * (Math.PI / 180)
    const wx = Math.cos(angle) * def.radius * 0.55
    const wy = Math.sin(angle) * def.radius * 0.55
    drawGlowDot(ctx, wx, wy, def.radius * 0.09 * (0.7 + pulse * 0.3), glowColor, 8)
  }
  return result
}

/**
 * Dispatches to a per-creature draw function by behavior/defId. Returns the head anchor (or
 * null for the headless Exploder) so the caller can layer eyes/status icons on top without
 * recomputing an offset that might drift from wherever the body actually drew its head.
 */
export function drawEnemyCharacter(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  def: EnemyDefinition,
  color: string,
  anim: EnemyAnimInputs,
): HumanoidDrawResult | null {
  if (def.behavior === 'boss') return drawBoss(ctx, enemy, def, color, anim)
  if (def.behavior === 'stalker') return drawStalker(ctx, enemy, def, color, anim)
  if (def.behavior === 'ranged') return drawSpitter(ctx, enemy, def, color, anim)
  if (enemy.defId === 'exploder') {
    drawExploder(ctx, enemy, def, color, anim)
    return null
  }
  if (enemy.defId === 'brute') return drawBrute(ctx, enemy, def, color, anim)
  if (enemy.defId === 'runner') return drawRunner(ctx, def, color, anim)
  return drawWalker(ctx, def, color, anim)
}
