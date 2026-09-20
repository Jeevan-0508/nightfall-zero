import type { AbilityDefinition } from '../game/engine/types'

export const dash: AbilityDefinition = {
  id: 'dash',
  name: 'Dash',
  key: 'SHIFT',
  cooldown: 4,
}

export const grenade: AbilityDefinition = {
  id: 'grenade',
  name: 'Grenade',
  key: 'Q',
  cooldown: 6,
}

export const overcharge: AbilityDefinition = {
  id: 'overcharge',
  name: 'Overcharge',
  key: 'E',
  cooldown: 15,
  duration: 4,
}

export const abilityOrder: AbilityDefinition[] = [dash, grenade, overcharge]

export const abilities: Record<string, AbilityDefinition> = {
  [dash.id]: dash,
  [grenade.id]: grenade,
  [overcharge.id]: overcharge,
}
