export interface Vector2 {
  x: number
  y: number
}

export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subtract(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vector2, s: number): Vector2 {
  return { x: v.x * s, y: v.y * s }
}

export function length(v: Vector2): number {
  return Math.hypot(v.x, v.y)
}

export function normalize(v: Vector2): Vector2 {
  const len = length(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

export function distance(a: Vector2, b: Vector2): number {
  return length(subtract(a, b))
}

export function angleTo(from: Vector2, to: Vector2): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

export function fromAngle(angle: number, magnitude = 1): Vector2 {
  return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
