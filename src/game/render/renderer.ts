import type { GameEngine } from '../engine/GameEngine'
import { ARENA_HEIGHT, ARENA_WIDTH } from '../engine/types'
import { enemies as enemyDefs } from '../../content/enemies'

const GRID_SIZE = 48

export function draw(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  const { width, height } = ctx.canvas
  ctx.save()
  ctx.clearRect(0, 0, width, height)

  const shakeX = engine.screenShake > 0 ? (Math.random() - 0.5) * engine.screenShake * 24 : 0
  const shakeY = engine.screenShake > 0 ? (Math.random() - 0.5) * engine.screenShake * 24 : 0
  ctx.translate(shakeX, shakeY)

  drawBackground(ctx)
  drawParticlesUnder(ctx, engine)
  drawEnemies(ctx, engine)
  drawProjectiles(ctx, engine)
  drawEnemyProjectiles(ctx, engine)
  drawGrenades(ctx, engine)
  drawPlayer(ctx, engine)
  drawParticlesOver(ctx, engine)
  drawVignette(ctx)

  ctx.restore()
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#0a0e16'
  ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT)

  ctx.strokeStyle = 'rgba(60, 90, 140, 0.12)'
  ctx.lineWidth = 1
  for (let x = 0; x <= ARENA_WIDTH; x += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, ARENA_HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= ARENA_HEIGHT; y += GRID_SIZE) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(ARENA_WIDTH, y)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(180, 40, 40, 0.35)'
  ctx.lineWidth = 3
  ctx.strokeRect(1.5, 1.5, ARENA_WIDTH - 3, ARENA_HEIGHT - 3)
}

function drawPlayer(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  const { position, rotation, radius } = engine.player
  const recoilOffset = engine.recoilAmount
  const drawX = position.x - Math.cos(rotation) * recoilOffset
  const drawY = position.y - Math.sin(rotation) * recoilOffset

  ctx.save()
  ctx.translate(position.x, position.y)
  ctx.beginPath()
  ctx.arc(0, 0, radius + 6, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(60, 140, 255, 0.12)'
  ctx.fill()

  const equippedState = engine.player.weapons[engine.player.equippedWeaponId]
  if (equippedState.reloading) {
    const progress = 1 - equippedState.reloadRemaining / engine.weaponDef.reloadTime
    ctx.beginPath()
    ctx.arc(0, 0, radius + 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2)
    ctx.strokeStyle = '#4f8cff'
    ctx.lineWidth = 3
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.translate(drawX, drawY)
  ctx.rotate(rotation)
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = engine.status === 'dead' ? '#3a3a3a' : '#3b7dd8'
  ctx.fill()
  ctx.strokeStyle = '#dbe9ff'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(radius - 2, 0)
  ctx.lineTo(radius + 16, 0)
  ctx.strokeStyle = '#dbe9ff'
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.restore()
}

function drawEnemies(ctx: CanvasRenderingContext2D, engine: GameEngine): void {
  for (const enemy of engine.enemyList) {
    if (!enemy.alive) continue
    const def = enemyDefs[enemy.defId]
    if (!def) continue

    ctx.save()
    ctx.translate(enemy.position.x, enemy.position.y)
    ctx.globalAlpha = enemy.cloaked ? 0.28 : 1

    if (def.explosionRadius) {
      const pulse = 0.5 + Math.sin(engine.stats.survivalTime * 9) * 0.5
      ctx.beginPath()
      ctx.arc(0, 0, def.radius + 4 + pulse * 4, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(224, 71, 58, ${0.3 + pulse * 0.4})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(0, 0, def.radius, 0, Math.PI * 2)
    ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : def.color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 2
    ctx.stroke()

    if (!enemy.cloaked) {
      const barWidth = def.radius * 2
      const healthRatio = Math.max(0, enemy.health / enemy.maxHealth)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(-barWidth / 2, -def.radius - 10, barWidth, 4)
      ctx.fillStyle = healthRatio > 0.5 ? '#7fd858' : healthRatio > 0.25 ? '#e0b23a' : '#e0473a'
      ctx.fillRect(-barWidth / 2, -def.radius - 10, barWidth * healthRatio, 4)
    }

    ctx.restore()
  }
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
  ctx.fillStyle = '#ffe9a8'
  for (const p of engine.projectiles) {
    ctx.beginPath()
    ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2)
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
    } else if (p.kind === 'shell') {
      ctx.save()
      ctx.translate(p.position.x, p.position.y)
      ctx.rotate(Math.atan2(p.velocity.y, p.velocity.x))
      ctx.fillStyle = p.color
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
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.position.x, p.position.y, 8, 0, Math.PI * 2)
      ctx.fill()
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
    }
  }
  ctx.globalAlpha = 1
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
