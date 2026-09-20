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

export function spawnMuzzleFlash(particles: Particle[], position: Vector2, angle: number): void {
  const dir = fromAngle(angle, 40)
  spawn(particles, 'muzzle', position, dir, 0.06, '#fff2b0')
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
    if (p.kind === 'impact' || p.kind === 'death') {
      p.velocity = { x: p.velocity.x * 0.9, y: p.velocity.y * 0.9 }
    }
    alive.push(p)
  }
  return alive
}
