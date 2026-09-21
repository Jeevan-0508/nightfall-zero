import { describe, expect, it } from 'vitest'
import type { Particle } from '../game/engine/types'
import { MAX_PARTICLES, spawnHitMarker, spawnShellCasing } from '../game/engine/particles'

describe('particle cap and priority eviction', () => {
  it('never grows the array past MAX_PARTICLES', () => {
    const particles: Particle[] = []
    for (let i = 0; i < MAX_PARTICLES + 50; i++) {
      spawnShellCasing(particles, { x: 0, y: 0 }, 0)
    }
    expect(particles.length).toBeLessThanOrEqual(MAX_PARTICLES)
  })

  it('evicts a low-priority shell casing to make room for a higher-priority hit marker at capacity', () => {
    const particles: Particle[] = []
    for (let i = 0; i < MAX_PARTICLES; i++) {
      spawnShellCasing(particles, { x: 0, y: 0 }, 0)
    }
    expect(particles.length).toBe(MAX_PARTICLES)
    expect(particles.some((p) => p.kind === 'hitmarker')).toBe(false)

    spawnHitMarker(particles, { x: 1, y: 1 }, false)

    expect(particles.length).toBe(MAX_PARTICLES)
    expect(particles.some((p) => p.kind === 'hitmarker')).toBe(true)
    expect(particles.filter((p) => p.kind === 'shell')).toHaveLength(MAX_PARTICLES - 1)
  })

  it('drops a new spawn instead of evicting an equal-or-higher priority particle', () => {
    const particles: Particle[] = []
    for (let i = 0; i < MAX_PARTICLES; i++) {
      spawnHitMarker(particles, { x: 0, y: 0 }, false)
    }
    expect(particles.length).toBe(MAX_PARTICLES)

    spawnHitMarker(particles, { x: 1, y: 1 }, false)

    // At capacity with nothing lower-priority to evict, the new spawn is simply skipped -
    // the array never grows past the cap and existing particles are left alone.
    expect(particles.length).toBe(MAX_PARTICLES)
  })

  it('under normal (non-crowded) play, particles spawn exactly as before', () => {
    const particles: Particle[] = []
    spawnShellCasing(particles, { x: 5, y: 5 }, 0)
    spawnHitMarker(particles, { x: 5, y: 5 }, true)
    expect(particles).toHaveLength(2)
  })
})
