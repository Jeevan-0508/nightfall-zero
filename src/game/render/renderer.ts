import type { GameEngine } from '../engine/GameEngine'
import { ARENA_HEIGHT, ARENA_WIDTH } from '../engine/types'
import { enemies as enemyDefs } from '../../content/enemies'

const GRID_SIZE = 48

// ---------- Ambient decoration (computed once, drawn every frame) ----------

interface SkylineBuilding {
  x: number
  w: number
  h: number
  windows: [number, number][]
}

function buildSkyline(): SkylineBuilding[] {
  const buildings: SkylineBuilding[] = []
  let x = -20
  while (x < ARENA_WIDTH + 20) {
    const w = 40 + Math.random() * 70
    const h = 30 + Math.random() * 46
    const windowCount = 2 + Math.floor(Math.random() * 4)
    const windows: [number, number][] = []
    for (let i = 0; i < windowCount; i++) {
      windows.push([6 + Math.random() * (w - 12), 6 + Math.random() * (h - 14)])
    }
    buildings.push({ x, w, h, windows })
    x += w + 6 + Math.random() * 20
  }
  return buildings
}

const SKYLINE = buildSkyline()

interface Ember {
  baseX: number
  baseY: number
  driftX: number
  driftY: number
  phase: number
  size: number
}

function buildEmbers(): Ember[] {
  const embers: Ember[] = []
  for (let i = 0; i < 26; i++) {
    embers.push({
      baseX: Math.random() * ARENA_WIDTH,
      baseY: 60 + Math.random() * (ARENA_HEIGHT - 60),
      driftX: (Math.random() - 0.5) * 14,
      driftY: -8 - Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      size: 1 + Math.random() * 1.8,
    })
  }
  return embers
}

const EMBERS = buildEmbers()

export interface HitIndicator {
  angle: number
  alpha: number
}

export interface DrawOptions {
  hitIndicators?: HitIndicator[]
  deathProgress?: number
}

export function draw(ctx: CanvasRenderingContext2D, engine: GameEngine, options: DrawOptions = {}): void {
  const { hitIndicators = [], deathProgress = 0 } = options
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.clearRect(0, 0, width, height)

  if (deathProgress > 0) {
    ctx.filter = `grayscale(${Math.min(70, deathProgress * 90)}%) contrast(${100 + deathProgress * 12}%)`
    const zoom = 1 + deathProgress * 0.05
    ctx.translate(width / 2, height / 2)
    ctx.scale(zoom, zoom)
    ctx.translate(-width / 2, -height / 2)
  }

  const shakeX = engine.screenShake > 0 ? (Math.random() - 0.5) * engine.screenShake * 24 : 0
  const shakeY = engine.screenShake > 0 ? (Math.random() - 0.5) * engine.screenShake * 24 : 0
  ctx.translate(shakeX, shakeY)

  drawBackground(ctx, engine)
  drawObstacles(ctx, engine)
  drawParticlesUnder(ctx, engine)
  drawEnemies(ctx, engine)
  drawProjectiles(ctx, engine)
  drawEnemyProjectiles(ctx, engine)
  drawGrenades(ctx, engine)
  drawPlayer(ctx, engine)
  drawParticlesOver(ctx, engine)
  drawGroundFog(ctx, engine)
  drawHitIndicators(ctx, engine, hitIndicators)
  drawVignette(ctx)

  if (deathProgress > 0) {
    ctx.filter = 'none'
    ctx.fillStyle = `rgba(160, 20, 20, ${deathProgress * 0.32})`
    ctx.fillRect(0, 0, width, height)
  }

  ctx.restore()
}

function drawHitIndicators(ctx: CanvasRenderingContext2D, engine: GameEngine, indicators: HitIndicator[]): void {
  const { position, radius } = engine.player
  for (const indicator of indicators) {
    const alpha = Math.max(0, Math.min(1, indicator.alpha))
    if (alpha <= 0) continue
    const dist = radius + 22
    const x = position.x + Math.cos(indicator.angle) * dist
    const y = position.y + Math.sin(indicator.angle) * dist

    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(indicator.angle)
    ctx.beginPath()
    ctx.moveTo(-8, -10)
    ctx.lineTo(8, 0)
    ctx.lineTo(-8, 10)
    ctx.closePath()
    ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.85})`
    ctx.shadowColor = 'rgba(255, 60, 60, 0.8)'
    ctx.shadowBlur = 8
    ctx.fill()
    ctx.restore()
  }
}

function withAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface MapPalette {
  skyTop: string
  skyMid: string
  skyBottom: string
  gridV: string
  gridH: string
  fog: string
}

const MAP_PALETTES: Record<string, MapPalette> = {
  crossroads: {
    skyTop: '#120b1c',
    skyMid: '#0b0e1a',
    skyBottom: '#050609',
    gridV: '90, 60, 160',
    gridH: '40, 160, 190',
    fog: '140, 160, 200',
  },
  bunker: {
    skyTop: '#1c1108',
    skyMid: '#140d0a',
    skyBottom: '#070504',
    gridV: '170, 90, 40',
    gridH: '200, 140, 40',
    fog: '200, 160, 120',
  },
  scatter: {
    skyTop: '#0a0f1c',
    skyMid: '#080b16',
    skyBottom: '#03040a',
    gridV: '60, 90, 190',
    gridH: '130, 60, 200',
    fog: '150, 150, 220',
  },
}

function mapPalette(engine: GameEngine): MapPalette {
  return MAP_PALETTES[engine.map.id] ?? MAP_PALETTES.crossroads
}

const WEAPON_TRACER_COLOR: Record<string, string> = {
  pistol: '#ffcf6a',
  shotgun: '#ffb04d',
  smg: '#ffe28a',
  'assault-rifle': '#ffcf6a',
  sniper: '#bfe3ff',
  flamethrower: '#ff6a3d',
  'rocket-launcher': '#ff8a3d',
  'energy-weapon': '#5be3e3',
}

function drawBackground(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  const t = engine.stats.survivalTime

  const palette = mapPalette(engine)
  const sky = ctx.createLinearGradient(0, 0, 0, ARENA_HEIGHT)
  sky.addColorStop(0, palette.skyTop)
  sky.addColorStop(0.35, palette.skyMid)
  sky.addColorStop(1, palette.skyBottom)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

  drawSkyline(ctx)

  const pulse = 0.5 + Math.sin(t * 0.6) * 0.5
  ctx.strokeStyle = `rgba(${palette.gridV}, ${0.06 + pulse * 0.05})`
  ctx.lineWidth = 1
  for (let x = 0; x <= ARENA_WIDTH; x += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, ARENA_HEIGHT)
    ctx.stroke()
  }
  ctx.strokeStyle = `rgba(${palette.gridH}, ${0.05 + pulse * 0.05})`
  for (let y = 0; y <= ARENA_HEIGHT; y += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(ARENA_WIDTH, y)
    ctx.stroke()
  }

  drawEmbers(ctx, t)

  ctx.strokeStyle = 'rgba(200, 50, 50, 0.4)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, ARENA_WIDTH - 3, ARENA_HEIGHT - 3)
  drawCornerBrackets(ctx)
}

function drawSkyline(ctx: CanvasRenderingContext2D): void {
  for (const b of SKYLINE) {
    ctx.fillStyle = '#0c0f18'
    ctx.fillRect(b.x, 0, b.w, b.h)
    ctx.fillStyle = 'rgba(60, 40, 90, 0.25)'
    ctx.fillRect(b.x, b.h - 2, b.w, 2)
    for (const [wx, wy] of b.windows) {
      if (wy > b.h - 6) continue
      ctx.fillStyle = Math.random() < 0.02 ? 'rgba(255, 200, 90, 0.05)' : 'rgba(255, 200, 90, 0.5)'
      ctx.fillRect(b.x + wx, wy, 3, 4)
    }
  }
}

function drawEmbers(ctx: CanvasRenderingContext2D, t: number): void {
  for (const e of EMBERS) {
    const life = (t * 0.4 + e.phase) % (Math.PI * 2)
    const x = e.baseX + Math.sin(life) * e.driftX
    const y = ((e.baseY + t * e.driftY) % (ARENA_HEIGHT - 40)) + 20
    const twinkle = 0.3 + Math.abs(Math.sin(life * 2)) * 0.5
    ctx.beginPath()
    ctx.fillStyle = `rgba(255, 160, 90, ${twinkle * 0.7})`
    ctx.shadowColor = 'rgba(255, 140, 70, 0.8)'
    ctx.shadowBlur = 4
    ctx.arc(x, y, e.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawCornerBrackets(ctx: CanvasRenderingContext2D): void {
  const len = 26
  const inset = 6
  const corners: [number, number, number, number][] = [
    [inset, inset, 1, 1],
    [ARENA_WIDTH - inset, inset, -1, 1],
    [inset, ARENA_HEIGHT - inset, 1, -1],
    [ARENA_WIDTH - inset, ARENA_HEIGHT - inset, -1, -1],
  ]
  ctx.strokeStyle = 'rgba(90, 220, 220, 0.5)'
  ctx.lineWidth = 2
  for (const [x, y, dx, dy] of corners) {
    ctx.beginPath()
    ctx.moveTo(x, y + len * dy)
    ctx.lineTo(x, y)
    ctx.lineTo(x + len * dx, y)
    ctx.stroke()
  }
}

function drawGroundFog(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  const fogPalette = mapPalette(engine)
  const t = engine.stats.survivalTime
  ctx.save()
  for (let i = 0; i < 3; i++) {
    const cx = ((Math.sin(t * 0.05 + i * 2.1) + 1) / 2) * ARENA_WIDTH
    const cy = ARENA_HEIGHT * (0.65 + i * 0.12)
    const r = 220 + i * 40
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    gradient.addColorStop(0, `rgba(${fogPalette.fog}, 0.05)`)
    gradient.addColorStop(1, `rgba(${fogPalette.fog}, 0)`)
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawObstacles(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  for (const obstacle of engine.map.obstacles) {
    drawRuin(ctx, obstacle.position.x, obstacle.position.y, obstacle.radius)
  }
}

function drawRuin(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  const seed = Math.floor(Math.abs(x * 7 + y * 13))
  const variant = seed % 3

  ctx.save()
  ctx.translate(x, y)

  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
  ctx.shadowBlur = 9
  const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.15, 0, 0, radius)
  if (variant === 0) {
    grad.addColorStop(0, '#3c414c')
    grad.addColorStop(1, '#1b1e26')
  } else if (variant === 1) {
    grad.addColorStop(0, '#352f29')
    grad.addColorStop(1, '#17130f')
  } else {
    grad.addColorStop(0, '#2e353f')
    grad.addColorStop(1, '#131720')
  }
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.shadowBlur = 0

  ctx.beginPath()
  ctx.arc(0, 0, radius - 1.5, -Math.PI * 0.85, -Math.PI * 0.35)
  ctx.strokeStyle = 'rgba(150, 180, 220, 0.3)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-radius * 0.3, -radius * 0.6)
  ctx.lineTo(radius * 0.08, -radius * 0.1)
  ctx.lineTo(-radius * 0.2, radius * 0.55)
  ctx.stroke()

  if (seed % 5 < 2) {
    const glowColor = variant === 1 ? 'rgba(255, 140, 60, 0.55)' : 'rgba(120, 200, 255, 0.4)'
    ctx.beginPath()
    ctx.fillStyle = glowColor
    ctx.shadowColor = glowColor
    ctx.shadowBlur = 8
    ctx.arc(radius * 0.35, radius * 0.2, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(120, 130, 150, 0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()
}

function drawPlayer(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  const { position, rotation, radius, health, maxHealth } = engine.player
  const recoilOffset = engine.recoilAmount
  const drawX = position.x - Math.cos(rotation) * recoilOffset
  const drawY = position.y - Math.sin(rotation) * recoilOffset
  const isDead = engine.status === 'dead'
  const healthRatio = maxHealth > 0 ? health / maxHealth : 1
  const statusColor = isDead ? '#4a4a4a' : healthRatio > 0.5 ? '#3fd8a0' : healthRatio > 0.25 ? '#e0b23a' : '#e0473a'

  ctx.save()
  ctx.translate(position.x, position.y)
  const auraPulse = isDead ? 0 : 0.6 + Math.sin(engine.stats.survivalTime * 3) * 0.4
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
  ctx.restore()

  ctx.save()
  ctx.translate(drawX, drawY)
  ctx.rotate(rotation)

  ctx.beginPath()
  ctx.ellipse(2, radius * 0.6, radius * 0.9, radius * 0.35, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fill()

  const bodyGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.2, 0, 0, radius)
  if (isDead) {
    bodyGrad.addColorStop(0, '#4a4a4a')
    bodyGrad.addColorStop(1, '#232323')
  } else {
    bodyGrad.addColorStop(0, '#5fa4f2')
    bodyGrad.addColorStop(1, '#28599e')
  }
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = bodyGrad
  ctx.fill()
  ctx.strokeStyle = '#dbe9ff'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = isDead ? 'rgba(120,120,120,0.5)' : 'rgba(20, 30, 50, 0.55)'
  ctx.beginPath()
  ctx.ellipse(-radius * 0.15, 0, radius * 0.7, radius * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()

  if (!isDead) {
    ctx.beginPath()
    ctx.fillStyle = '#bdf3ff'
    ctx.shadowColor = '#7fe9ff'
    ctx.shadowBlur = 6
    ctx.arc(radius * 0.35, 0, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }

  ctx.beginPath()
  ctx.moveTo(radius - 2, -3)
  ctx.lineTo(radius + 17, -3)
  ctx.lineTo(radius + 17, 3)
  ctx.lineTo(radius - 2, 3)
  ctx.closePath()
  ctx.fillStyle = isDead ? '#5a5a5a' : '#1c2634'
  ctx.fill()
  ctx.strokeStyle = '#dbe9ff'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.restore()
}

// ---------- Enemy silhouettes ----------

function drawSpikedBlob(
  ctx: CanvasRenderingContext2D,
  radius: number,
  spikeCount: number,
  spikeRatio: number,
): void {
  ctx.beginPath()
  for (let i = 0; i < spikeCount * 2; i++) {
    const angle = (i / (spikeCount * 2)) * Math.PI * 2
    const r = i % 2 === 0 ? radius : radius * spikeRatio
    const px = Math.cos(angle) * r
    const py = Math.sin(angle) * r
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

function drawEyes(ctx: CanvasRenderingContext2D, radius: number, facing: number, color: string): void {
  const spread = radius * 0.32
  const forward = radius * 0.45
  for (const side of [-1, 1]) {
    const ex = Math.cos(facing) * forward + Math.cos(facing + Math.PI / 2) * spread * side
    const ey = Math.sin(facing) * forward + Math.sin(facing + Math.PI / 2) * spread * side
    ctx.beginPath()
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 5
    ctx.arc(ex, ey, 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0
}

function drawEnemies(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  for (const enemy of engine.enemyList) {
    if (!enemy.alive) continue
    const def = enemyDefs[enemy.defId]
    if (!def) continue

    const speed = Math.hypot(enemy.velocity.x, enemy.velocity.y)
    const toPlayer = Math.atan2(engine.player.position.y - enemy.position.y, engine.player.position.x - enemy.position.x)
    const facing = speed > 4 ? Math.atan2(enemy.velocity.y, enemy.velocity.x) : toPlayer

    ctx.save()
    ctx.translate(enemy.position.x, enemy.position.y)

    ctx.beginPath()
    ctx.ellipse(2, def.radius * 0.55, def.radius * 0.85, def.radius * 0.32, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fill()

    ctx.globalAlpha = enemy.cloaked ? 0.25 : 1

    if (def.explosionRadius) {
      const pulse = 0.5 + Math.sin(engine.stats.survivalTime * 9) * 0.5
      ctx.beginPath()
      ctx.arc(0, 0, def.radius + 4 + pulse * 4, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(224, 71, 58, ${0.3 + pulse * 0.4})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    if (enemy.bossPhase === 'telegraph') {
      const pulse = 0.5 + Math.sin(engine.stats.survivalTime * 20) * 0.5
      ctx.beginPath()
      ctx.arc(0, 0, def.radius + 8 + pulse * 6, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 60, 60, ${0.5 + pulse * 0.4})`
      ctx.lineWidth = 3
      ctx.stroke()

      if (enemy.bossAttackId === 'slam') {
        ctx.beginPath()
        ctx.arc(0, 0, def.bossSlamRadius ?? 100, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 60, 60, 0.35)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    if (def.behavior === 'boss') {
      drawBossAura(ctx, enemy.defId, def.radius, engine.stats.survivalTime)
    }

    ctx.rotate(facing)
    const bodyColor = enemy.hitFlash > 0 ? '#ffffff' : def.color
    drawEnemyBody(ctx, def.behavior, enemy.defId, def.radius, bodyColor)
    ctx.rotate(-facing)

    if (!enemy.cloaked || def.behavior === 'stalker') {
      const eyeColor = def.behavior === 'stalker' && enemy.cloaked ? 'rgba(255,255,255,0.85)' : '#fff6d0'
      drawEyes(ctx, def.radius, facing, eyeColor)
    }

    if (!enemy.cloaked) {
      const barWidth = def.radius * 2
      const healthRatio = Math.max(0, enemy.health / enemy.maxHealth)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(-barWidth / 2, -def.radius - 10, barWidth, 4)
      ctx.fillStyle = healthRatio > 0.5 ? '#7fd858' : healthRatio > 0.25 ? '#e0b23a' : '#e0473a'
      ctx.fillRect(-barWidth / 2, -def.radius - 10, barWidth * healthRatio, 4)
    }

    ctx.globalAlpha = 1
    ctx.restore()
  }
}

function drawEnemyBody(
  ctx: CanvasRenderingContext2D,
  behavior: string,
  defId: string,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 2

  if (behavior === 'melee') {
    const spikeCount = defId === 'brute' ? 5 : defId === 'runner' ? 9 : 7
    const spikeRatio = defId === 'brute' ? 0.82 : 0.68
    drawSpikedBlob(ctx, radius, spikeCount, spikeRatio)
    ctx.fill()
    ctx.stroke()
    return
  }

  if (behavior === 'ranged') {
    ctx.beginPath()
    ctx.ellipse(radius * 0.15, 0, radius * 1.05, radius * 0.85, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
    ctx.shadowColor = color
    ctx.shadowBlur = 6
    ctx.arc(radius * 0.75, 0, 2.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    return
  }

  if (behavior === 'stalker') {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    for (const a of [-0.5, 0, 0.5]) {
      ctx.beginPath()
      ctx.moveTo(radius * 0.5, a * radius)
      ctx.lineTo(radius * 1.4, a * radius * 1.6)
      ctx.stroke()
    }
    return
  }

  if (behavior === 'boss') {
    const spikeCount = defId === 'overlord' ? 10 : 8
    const spikeRatio = defId === 'overlord' ? 0.88 : 0.72
    drawSpikedBlob(ctx, radius, spikeCount, spikeRatio)
    ctx.fill()
    ctx.lineWidth = 3
    ctx.stroke()
    return
  }

  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
}

function drawBossAura(ctx: CanvasRenderingContext2D, defId: string, radius: number, t: number): void {
  const pulse = 0.5 + Math.sin(t * 2.4) * 0.5
  const auraColor = defId === 'overlord' ? `rgba(201, 162, 39, ${0.15 + pulse * 0.1})` : `rgba(201, 74, 39, ${0.18 + pulse * 0.12})`
  ctx.beginPath()
  ctx.arc(0, 0, radius + 14 + pulse * 5, 0, Math.PI * 2)
  ctx.strokeStyle = auraColor
  ctx.lineWidth = 4
  ctx.stroke()
}

function drawEnemyProjectiles(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  ctx.fillStyle = '#7dffb0'
  ctx.shadowColor = '#7dffb0'
  ctx.shadowBlur = 6
  for (const p of engine.enemyProjectiles) {
    ctx.beginPath()
    ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.shadowBlur = 0
}

function drawGrenades(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  for (const g of engine.grenades) {
    const urgency = Math.max(0, 1 - g.fuseRemaining)
    const pulse = 0.5 + 0.5 * Math.sin(g.fuseRemaining * Math.PI * 14)

    ctx.fillStyle = '#2a2f38'
    ctx.beginPath()
    ctx.arc(g.position.x, g.position.y, 7, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = `rgba(255, ${Math.round(90 - urgency * 60)}, 40, ${0.4 + urgency * 0.5 * pulse})`
    ctx.shadowColor = '#ff5a28'
    ctx.shadowBlur = 6 + urgency * 10
    ctx.beginPath()
    ctx.arc(g.position.x, g.position.y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  for (const p of engine.projectiles) {
    const speed = Math.hypot(p.velocity.x, p.velocity.y) || 1
    const trailLength = Math.min(22, speed * 0.045)
    const nx = p.velocity.x / speed
    const ny = p.velocity.y / speed

    ctx.save()
    const tracerColor = WEAPON_TRACER_COLOR[p.weaponId] ?? '#ffcf6a'
    ctx.shadowColor = tracerColor
    ctx.shadowBlur = 5
    const tracer = ctx.createLinearGradient(
      p.position.x - nx * trailLength,
      p.position.y - ny * trailLength,
      p.position.x,
      p.position.y,
    )
    tracer.addColorStop(0, withAlpha(tracerColor, 0))
    tracer.addColorStop(1, withAlpha(tracerColor, 0.9))
    ctx.strokeStyle = tracer
    ctx.lineWidth = p.radius * 1.4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(p.position.x - nx * trailLength, p.position.y - ny * trailLength)
    ctx.lineTo(p.position.x, p.position.y)
    ctx.stroke()
    ctx.restore()

    ctx.beginPath()
    ctx.fillStyle = '#fff6da'
    ctx.arc(p.position.x, p.position.y, p.radius * 0.7, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawParticlesUnder(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  for (const p of engine.particles) {
    const alpha = 1 - p.age / p.ttl
    ctx.globalAlpha = Math.max(0, alpha)

    if (p.kind === 'impact' || p.kind === 'death') {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.position.x, p.position.y, p.kind === 'death' ? 4 : 2.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = p.color
      ctx.lineWidth = 1
      const sparkLen = p.kind === 'death' ? 6 : 3.5
      const sparkSpeed = Math.hypot(p.velocity.x, p.velocity.y) || 1
      ctx.beginPath()
      ctx.moveTo(p.position.x, p.position.y)
      ctx.lineTo(
        p.position.x - (p.velocity.x / sparkSpeed) * sparkLen,
        p.position.y - (p.velocity.y / sparkSpeed) * sparkLen,
      )
      ctx.stroke()
    } else if (p.kind === 'shell') {
      ctx.save()
      ctx.translate(p.position.x, p.position.y)
      ctx.rotate(Math.atan2(p.velocity.y, p.velocity.x) + p.age * 18)
      const shellGrad = ctx.createLinearGradient(-3, 0, 3, 0)
      shellGrad.addColorStop(0, '#8a6a2a')
      shellGrad.addColorStop(0.5, '#f0d382')
      shellGrad.addColorStop(1, '#8a6a2a')
      ctx.fillStyle = shellGrad
      ctx.fillRect(-3, -1, 6, 2)
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
}

function drawParticlesOver(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  for (const p of engine.particles) {
    const alpha = 1 - p.age / p.ttl
    ctx.globalAlpha = Math.max(0, alpha)

    if (p.kind === 'muzzle') {
      const flicker = 0.7 + Math.random() * 0.3
      const speed = Math.hypot(p.velocity.x, p.velocity.y) || 1
      const angle = Math.atan2(p.velocity.y, p.velocity.x)
      ctx.save()
      ctx.translate(p.position.x, p.position.y)
      ctx.rotate(angle)
      const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 16 * flicker)
      flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
      flashGrad.addColorStop(0.5, withAlpha(p.color, 0.6))
      flashGrad.addColorStop(1, withAlpha(p.color, 0))
      ctx.fillStyle = flashGrad
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(14 * flicker, -6)
      ctx.lineTo(20 * flicker, 0)
      ctx.lineTo(14 * flicker, 6)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      void speed
    } else if (p.kind === 'damageText') {
      ctx.fillStyle = p.color
      ctx.font = p.crit ? 'bold 18px sans-serif' : '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.text ?? '', p.position.x, p.position.y)
    } else if (p.kind === 'hitmarker') {
      const size = p.crit ? 10 : 6
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.crit ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(p.position.x - size, p.position.y - size)
      ctx.lineTo(p.position.x + size, p.position.y + size)
      ctx.moveTo(p.position.x + size, p.position.y - size)
      ctx.lineTo(p.position.x - size, p.position.y + size)
      ctx.stroke()
    } else if (p.kind === 'spawnRing') {
      const radius = 8 + (p.age / p.ttl) * 24
      ctx.strokeStyle = p.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2)
      ctx.stroke()
    } else if (p.kind === 'explosion') {
      drawExplosion(ctx, p)
    } else if (p.kind === 'dashTrail') {
      const fade = 1 - p.age / p.ttl
      const grad = ctx.createRadialGradient(p.position.x, p.position.y, 0, p.position.x, p.position.y, 15)
      grad.addColorStop(0, withAlpha(p.color, fade * 0.5))
      grad.addColorStop(1, withAlpha(p.color, 0))
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.position.x, p.position.y, 15, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

function drawExplosion(
  ctx: CanvasRenderingContext2D,
  p: { position: { x: number; y: number }; age: number; ttl: number; id: number },
): void {
  const progress = p.age / p.ttl
  const radius = 10 + progress * 70
  const gradient = ctx.createRadialGradient(p.position.x, p.position.y, 0, p.position.x, p.position.y, radius)
  gradient.addColorStop(0, 'rgba(255, 230, 160, 0.9)')
  gradient.addColorStop(0.5, 'rgba(255, 138, 61, 0.5)')
  gradient.addColorStop(1, 'rgba(255, 138, 61, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(p.position.x, p.position.y, radius, 0, Math.PI * 2)
  ctx.fill()

  const shockAlpha = Math.max(0, 1 - progress * 1.6)
  if (shockAlpha > 0) {
    ctx.beginPath()
    ctx.strokeStyle = `rgba(255, 220, 180, ${shockAlpha * 0.6})`
    ctx.lineWidth = 2
    ctx.arc(p.position.x, p.position.y, radius * 1.15, 0, Math.PI * 2)
    ctx.stroke()
  }

  const debrisCount = 6
  ctx.strokeStyle = `rgba(60, 50, 40, ${Math.max(0, 1 - progress) * 0.7})`
  ctx.lineWidth = 2
  for (let i = 0; i < debrisCount; i++) {
    const angle = ((p.id * 37 + i * 61) % 360) * (Math.PI / 180)
    const shardR = radius * (0.5 + (i % 3) * 0.2)
    ctx.beginPath()
    ctx.moveTo(p.position.x + Math.cos(angle) * shardR * 0.4, p.position.y + Math.sin(angle) * shardR * 0.4)
    ctx.lineTo(p.position.x + Math.cos(angle) * shardR, p.position.y + Math.sin(angle) * shardR)
    ctx.stroke()
  }
}

function drawVignette(ctx: CanvasRenderingContext2D): void {
  const gradient = ctx.createRadialGradient(
    ARENA_WIDTH / 2,
    ARENA_HEIGHT / 2,
    ARENA_HEIGHT / 2.2,
    ARENA_WIDTH / 2,
    ARENA_HEIGHT / 2,
    ARENA_HEIGHT,
  )
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
}
