/**
 * All sound is synthesized in-browser via WebAudio — there are no sampled
 * assets to ship or go missing. This is a real, functional audio system,
 * just a procedural one (see project README for the "no fake features" rule).
 */

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let masterVolume = 0.35

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextClass = window.AudioContext
  if (!AudioContextClass) return null

  if (!ctx) {
    ctx = new AudioContextClass()
    masterGain = ctx.createGain()
    masterGain.gain.value = masterVolume
    masterGain.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function setMasterVolume(volume: number): void {
  masterVolume = Math.max(0, Math.min(1, volume))
  if (masterGain) masterGain.gain.value = masterVolume
}

function noiseBurst(audioCtx: AudioContext, duration: number): AudioBufferSourceNode {
  const bufferSize = Math.max(1, Math.floor(audioCtx.sampleRate * duration))
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

  const source = audioCtx.createBufferSource()
  source.buffer = buffer
  return source
}

function envelope(audioCtx: AudioContext, node: GainNode, attack: number, decay: number, peak = 1): void {
  const now = audioCtx.currentTime
  node.gain.setValueAtTime(0, now)
  node.gain.linearRampToValueAtTime(peak, now + attack)
  node.gain.exponentialRampToValueAtTime(0.001, now + attack + decay)
}

export function playGunshot(): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const noise = noiseBurst(audioCtx, 0.08)
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 2400

  const gain = audioCtx.createGain()
  envelope(audioCtx, gain, 0.001, 0.08, 0.9)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)
  noise.start()
  noise.stop(audioCtx.currentTime + 0.09)
}

export function playHit(crit: boolean): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const osc = audioCtx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = crit ? 1100 : 700

  const gain = audioCtx.createGain()
  envelope(audioCtx, gain, 0.001, crit ? 0.09 : 0.05, crit ? 0.5 : 0.3)

  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.1)
}

export function playEnemyDeath(): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const osc = audioCtx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(220, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.22)

  const gain = audioCtx.createGain()
  envelope(audioCtx, gain, 0.001, 0.22, 0.4)

  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.23)
}

export function playPlayerHit(): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const osc = audioCtx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(160, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.15)

  const gain = audioCtx.createGain()
  envelope(audioCtx, gain, 0.001, 0.15, 0.55)

  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.16)
}

export function playExplosion(): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const noise = noiseBurst(audioCtx, 0.3)
  const filter = audioCtx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(900, audioCtx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.3)

  const gain = audioCtx.createGain()
  envelope(audioCtx, gain, 0.002, 0.3, 1)

  noise.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain)
  noise.start()
  noise.stop(audioCtx.currentTime + 0.31)
}

export function playWeaponSwitch(): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const osc = audioCtx.createOscillator()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(500, audioCtx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(750, audioCtx.currentTime + 0.05)

  const gain = audioCtx.createGain()
  envelope(audioCtx, gain, 0.001, 0.05, 0.2)

  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.06)
}

export function playReloadStart(): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const osc = audioCtx.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 320

  const gain = audioCtx.createGain()
  envelope(audioCtx, gain, 0.001, 0.04, 0.25)

  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioCtx.currentTime + 0.05)
}

export function playReloadComplete(): void {
  const audioCtx = getContext()
  if (!audioCtx || !masterGain) return

  const now = audioCtx.currentTime
  ;[420, 620].forEach((freq, i) => {
    const osc = audioCtx.createOscillator()
    osc.type = 'square'
    osc.frequency.value = freq
    const gain = audioCtx.createGain()
    const start = now + i * 0.06
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.3, start + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.07)
    osc.connect(gain)
    gain.connect(masterGain!)
    osc.start(start)
    osc.stop(start + 0.08)
  })
}
