import type { Army, GearSlot } from '../schema/army'
import custodes from './custodes/army.json'
import { custodesSlots } from './custodes/loadouts'

// Wargear rules are hand-written per army and merged onto the scraped unit data.
const withSlots = (army: Army, slots: Record<string, GearSlot[]>): Army => ({
  ...army,
  units: army.units.map((u) => (slots[u.id] ? { ...u, slots: slots[u.id] } : u)),
})

// To add an army: create armies/<id>/army.json (+ loadouts.ts) and register it here.
export const armies: Record<string, Army> = {
  custodes: withSlots(custodes as unknown as Army, custodesSlots),
}
export const armyList = Object.values(armies)
