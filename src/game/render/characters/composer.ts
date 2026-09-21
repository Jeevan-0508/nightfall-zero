/**
 * Shared procedural drawing primitives for every character in the game (player, all enemy
 * types, boss). One small "body plan" instead of six-plus bespoke sprite systems: a torso,
 * a head, two arms, two legs, composed from configurable proportions per creature type.
 *
 * Callers are expected to have already translated to the character's world position and
 * rotated to its facing angle, so every primitive here draws in local space where +x is
 * "forward" (matches the existing drawPlayer/drawEnemies convention in renderer.ts).
 *
 * SILHOUETTE > DETAIL: every shape here is a handful of arcs/paths, no per-frame gradients
 * beyond what a single body already used before this change - readability and frame budget
 * both matter more than fidelity.
 */

export interface HumanoidSpec {
  radius: number // overall silhouette radius - matches the entity's existing collision radius
  bodyColor: string
  strokeColor: string
  hunch: number // 0..1, forward lean/droop (Walker, Brute)
  headScale: number // head radius as a fraction of `radius`
  headForward: number // head center offset along facing, as a fraction of `radius`
  torsoWidthRatio: number // torso half-width across facing, as a fraction of `radius`
  torsoLengthRatio: number // torso half-length along facing, as a fraction of `radius`
  limbLengthRatio: number // arm/leg length as a fraction of `radius`
  strideAmplitude: number // 0..1, how far legs/arms swing - 0 for a stationary/idle pose
  walkPhase: number // radians, current point in the stride cycle
  jagged: boolean // torn/ragged torso silhouette instead of a smooth ellipse (Walker)
  alphaMultiplier: number // extra alpha reduction on top of caller's globalAlpha (Stalker)
}

export function defaultHumanoidSpec(radius: number, bodyColor: string): HumanoidSpec {
  return {
    radius,
    bodyColor,
    strokeColor: 'rgba(0, 0, 0, 0.5)',
    hunch: 0,
    headScale: 0.42,
    headForward: 0.55,
    torsoWidthRatio: 0.62,
    torsoLengthRatio: 0.72,
    limbLengthRatio: 0.9,
    strideAmplitude: 0,
    walkPhase: 0,
    jagged: false,
    alphaMultiplier: 1,
  }
}

/** Two boot/foot ellipses trailing BEHIND the torso's rear edge, swinging opposite each
 * other on the stride cycle. Positioned outside the torso's own footprint (not underneath
 * it) so they are never simply painted over once the torso is drawn on top - a stride still
 * reads as alternating feet peeking out from behind the body, matching a real top-down walk
 * cycle instead of vanishing entirely. */
function drawLegs(ctx: CanvasRenderingContext2D, spec: HumanoidSpec): void {
  const { radius, strideAmplitude, walkPhase, hunch, torsoLengthRatio } = spec
  const footRadius = radius * 0.24
  const spread = radius * 0.24
  const restX = -radius * torsoLengthRatio - footRadius * 0.9 - hunch * radius * 0.1
  const swingRange = radius * 0.55
  for (const side of [-1, 1]) {
    const swing = Math.sin(walkPhase + (side > 0 ? Math.PI : 0)) * strideAmplitude
    ctx.beginPath()
    ctx.fillStyle = 'rgba(14, 15, 16, 0.85)'
    ctx.ellipse(restX + swing * swingRange, side * spread, footRadius, footRadius * 0.8, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Two arms from the shoulders, swinging opposite the legs, each outlined in a dark border
 * so they stay readable even when `bodyColor` is close in tone to the torso underneath them
 * (a flat stroke in the same fill color as the body it sits on was previously invisible).
 * A small gloved hand-cap at the tip is what a weapon-holding caller anchors on to. */
function drawArms(ctx: CanvasRenderingContext2D, spec: HumanoidSpec): void {
  const { radius, strideAmplitude, walkPhase, torsoWidthRatio, limbLengthRatio } = spec
  const shoulderX = radius * 0.15
  const armLen = radius * limbLengthRatio * 0.6
  const armWidth = Math.max(2, radius * 0.22)
  ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    const swing = Math.sin(walkPhase + (side > 0 ? 0 : Math.PI)) * strideAmplitude
    const shoulderY = side * radius * torsoWidthRatio * 0.9
    const handX = shoulderX + armLen * (0.6 + swing * 0.3)
    const handY = shoulderY * 0.4 + swing * radius * 0.25
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY)
    ctx.lineTo(handX, handY)
    ctx.strokeStyle = 'rgba(10, 11, 13, 0.55)'
    ctx.lineWidth = armWidth + 1.4
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(shoulderX, shoulderY)
    ctx.lineTo(handX, handY)
    ctx.strokeStyle = spec.bodyColor
    ctx.lineWidth = armWidth
    ctx.stroke()
    ctx.beginPath()
    ctx.fillStyle = 'rgba(14, 15, 16, 0.85)'
    ctx.arc(handX, handY, armWidth * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Torso silhouette: a smooth ellipse by default, or a jagged/torn polygon when `jagged` is
 * set (Walker) - same closed-path cost either way, just a different point set. */
function drawTorso(ctx: CanvasRenderingContext2D, spec: HumanoidSpec): void {
  const { radius, torsoWidthRatio, torsoLengthRatio, hunch, jagged, bodyColor, strokeColor } = spec
  const cx = -hunch * radius * 0.12
  const lengthR = radius * torsoLengthRatio
  const widthR = radius * torsoWidthRatio

  ctx.beginPath()
  if (jagged) {
    const notches = 10
    for (let i = 0; i < notches; i++) {
      const angle = (i / notches) * Math.PI * 2
      const jitter = i % 3 === 0 ? 0.7 : i % 2 === 0 ? 0.92 : 1
      const px = cx + Math.cos(angle) * lengthR * jitter
      const py = Math.sin(angle) * widthR * jitter
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
  } else {
    ctx.ellipse(cx, 0, lengthR, widthR, 0, 0, Math.PI * 2)
  }
  ctx.fillStyle = bodyColor
  ctx.fill()
  ctx.strokeStyle = strokeColor
  ctx.lineWidth = 2
  ctx.stroke()

  // Chest-plate highlight: a single small darker overlay, not a gradient - sells "equipment"
  // silhouette-cheaply.
  ctx.beginPath()
  ctx.ellipse(cx + lengthR * 0.15, -widthR * 0.15, lengthR * 0.4, widthR * 0.35, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
  ctx.fill()
}

/** Head circle, offset forward of the torso center along facing - the single detail that
 * most reliably reads as "a creature with a face" from a top-down camera. */
function drawHead(ctx: CanvasRenderingContext2D, spec: HumanoidSpec, headColor: string): { x: number; y: number; r: number } {
  const { radius, headScale, headForward, hunch } = spec
  const hx = radius * headForward * (1 - hunch * 0.35)
  const hy = hunch * radius * 0.1
  const hr = radius * headScale
  ctx.beginPath()
  ctx.fillStyle = headColor
  ctx.arc(hx, hy, hr, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = spec.strokeColor
  ctx.lineWidth = 1.5
  ctx.stroke()
  return { x: hx, y: hy, r: hr }
}

export interface HumanoidDrawResult {
  head: { x: number; y: number; r: number }
}

/** Draws the full body plan (legs -> torso -> arms -> head) in the caller's already-rotated
 * local space, respecting the existing draw-order contract (limbs/torso under the head so the
 * silhouette reads front-to-back correctly). Returns the head anchor so callers can layer
 * eyes/visor/equipment glow on top without recomputing the offset. */
export function drawHumanoid(ctx: CanvasRenderingContext2D, spec: HumanoidSpec, headColor: string): HumanoidDrawResult {
  ctx.save()
  ctx.globalAlpha *= spec.alphaMultiplier
  drawLegs(ctx, spec)
  drawTorso(ctx, spec)
  drawArms(ctx, spec)
  const head = drawHead(ctx, spec, headColor)
  ctx.restore()
  return { head }
}

/** A single small glowing dot, reused for visors/eyes/equipment accents - the one cheap
 * shadowBlur per character the existing renderer already budgeted for (drawEyes did the same
 * before this change). */
export function drawGlowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, blur = 5): void {
  ctx.beginPath()
  ctx.fillStyle = color
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}
