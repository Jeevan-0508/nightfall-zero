import type { Particle, ParticleKind } from './types'
import type { Vector2 } from './vector'
import { fromAngle } from './vector'
import type { Rng } from './rng'
import { rangeFloat } from './rng'

let particleIdCounter = 0

function spawn(
  particles: Particle[],
  kind: ParticleKind,
  position: Vector2,
  velocity: Vector2,
  ttl: number,
  color: string,
  text?: string,
  crit?: boolean,
): void {
  particleIdCounter += 1
  particles.push({ id: particleIdCounter, kind, position: { ...position }, velocity, age: 0, ttl, color, text, crit })
}

const WEAPON_MUZZLE_COLOR: Record<string, string> = {
  pistol: '#fff2b0',
  shotgun: '#ffb04d',
  smg: '#ffe28a',
  'assault-rifle': '#ffcf6a',
  sniper: '#bfe3ff',
  flamethrower: '#ff6a3d',
  'rocket-launcher': '#ff8a3d',
  'energy-weapon': '#5be3e3',
}

export function spawnMuzzleFlash(particles: Particle[], position: Vector2, angle: number, weaponId?: string): void {
  const dir = fromAngle(angle, 40)
  const color = (weaponId && WEAPON_MUZZLE_COLOR[weaponId]) || '#fff2b0'
  spawn(particles, 'muzzle', position, dir, 0.06, color)
}

export function spawnImpact(particles: Particle[], rng: Rng, position: Vector2, count = 5): void {
  for (let i = 0; i < count; i++) {
    const angle = rangeFloat(rng, 0, Math.PI * 2)
    const speed = rangeFloat(rng, 40, 140)
    spawn(particles, 'impact', position, fromAngle(angle, speed), rangeFloat(rng, 0.15, 0.35), '#ffd27a')
  }
}

export function spawnDeathBurst(particles: Particle[], rng: Rng, position: Vector2, color: string): void {
  for (let i = 0; i < 10; i++) {
    const angle = rangeFloat(rng, 0, Math.PI * 2)
    const speed = rangeFloat(rng, 60, 200)
    spawn(particles, 'death', position, fromAngle(angle, speed), rangeFloat(rng, 0.3, 0.6), color)
  }
}

export function spawnShellCasing(particles: Particle[], position: Vector2, firingAngle: number): void {
  const ejectAngle = firingAngle + Math.PI / 2 + (Math.random() - 0.5) * 0.4
  const speed = 60 + Math.random() * 40
  spawn(particles, 'shell', position, fromAngle(ejectAngle, speed), 0.5, '#c9a227')
}

export function spawnHitMarker(particles: Particle[], position: Vector2, crit: boolean): void {
  spawn(particles, 'hitmarker', position, { x: 0, y: 0 }, crit ? 0.22 : 0.14, crit ? '#ff5252' : '#f2f2f2', undefined, crit)
}

export function spawnLevelUpBurst(particles: Particle[], rng: Rng, position: Vector2): void {
  spawn(particles, 'spawnRing', position, { x: 0, y: 0 }, 0.7, '#ffcf5c')
  spawn(particles, 'spawnRing', position, { x: 0, y: 0 }, 0.5, '#ffcf5c')
  for (let i = 0; i < 8; i++) {
    const angle = rangeFloat(rng, 0, Math.PI * 2)
    const speed = rangeFloat(rng, 60, 160)
    spawn(particles, 'death', position, fromAngle(angle, speed), rangeFloat(rng, 0.3, 0.6), '#ffcf5c')
  }
}

export function spawnDashTrail(particles: Particle[], from: Vector2, to: Vector2): void {
  const steps = 4
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1)
    const pos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
    spawn(particles, 'dashTrail', pos, { x: 0, y: 0 }, 0.22, '#5be3e3')
  }
}

export function spawnSpawnRing(particles: Particle[], position: Vector2): void {
  spawn(particles, 'spawnRing', position, { x: 0, y: 0 }, 0.4, '#4f8cff')
}

export function spawnExplosion(particles: Particle[], position: Vector2): void {
  spawn(particles, 'explosion', position, { x: 0, y: 0 }, 0.35, '#ff8a3d')
}

export function spawnSpit(particles: Particle[], position: Vector2, angle: number): void {
  const dir = fromAngle(angle, 30)
  spawn(particles, 'muzzle', position, dir, 0.08, '#7dffb0')
}

export function spawnDamageText(particles: Particle[], position: Vector2, amount: number, crit: boolean): void {
  spawn(
    particles,
    'damageText',
    { x: position.x + (Math.random() - 0.5) * 10, y: position.y - 10 },
    { x: 0, y: -40 },
    0.7,
    crit ? '#ff5252' : '#f2f2f2',
    Math.round(amount).toString(),
    crit,
  )
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  const alive: Particle[] = []
  for (const p of particles) {
    p.age += dt
    if (p.age >= p.ttl) continue
    p.position = { x: p.position.x + p.velocity.x * dt, y: p.position.y + p.velocity.y * dt }
    if (p.kind === 'impact' || p.kind === 'death' || p.kind === 'shell') {
      p.velocity = { x: p.velocity.x * 0.9, y: p.velocity.y * 0.9 }
    }
    alive.push(p)
  }
  return alive
}
