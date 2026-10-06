import { describe, expect, it } from 'vitest'
import { armies } from '../armies'
import { datasheetFor, type Unit } from '../schema/army'
import { enumerateLoadouts, gearSheet, headroom, loadoutPoints, loadoutSummary, normalizeLoadout, resolveSheet, selectChoice, setChoiceCount, slotCounts } from './loadout'

const army = armies.custodes
const unit = (name: string) => army.units.find((u) => u.name === name)!
const withSlots = army.units.filter((u) => u.slots?.length)

const names = (u: Unit) => {
  const ds = datasheetFor(u)
  return { weapons: new Set([...ds.ranged, ...ds.melee].map((w) => w.name)), abilities: new Set(ds.abilities.map((a) => a.name)) }
}
const rowNames = (rows: { name: string; count: number }[]) => rows.map((w) => `${w.name} x${w.count}`)

describe('loadout data', () => {
  it('only references weapons or abilities that exist on the datasheet, by exact name, never both', () => {
    for (const u of withSlots) {
      const { weapons, abilities } = names(u)
      for (const slot of u.slots!) for (const choice of slot.choices) for (const g of choice.gear) {
        const w = weapons.has(g.name), a = abilities.has(g.name)
        expect(w || a, `${u.name}: "${g.name}" is not on the datasheet`).toBe(true)
        expect(w && a, `${u.name}: "${g.name}" is both a weapon and an ability`).toBe(false)
      }
    }
  })

  it('has unique choice ids per slot and a limit only on real choices', () => {
    for (const u of withSlots) for (const slot of u.slots!) {
      const ids = slot.choices.map((c) => c.id)
      expect(new Set(ids).size, `${u.name}/${slot.id}`).toBe(ids.length)
      for (const id of Object.keys(slot.limit ?? {})) expect(ids, `${u.name}/${slot.id} limit`).toContain(id)
    }
  })

  it('shows every weapon and ability in at least one legal loadout', () => {
    for (const u of army.units) {
      const { weapons, abilities } = names(u)
      const seenW = new Set<string>(), seenA = new Set<string>()
      for (const s of u.sizes) for (const l of enumerateLoadouts(u, s.models)) {
        const r = resolveSheet(u, s.models, l)
        for (const w of [...r.ranged, ...r.melee]) seenW.add(w.name)
        for (const a of r.abilities) seenA.add(a.name)
      }
      for (const w of weapons) expect(seenW.has(w), `${u.name}: weapon "${w}" is never shown`).toBe(true)
      for (const a of abilities) expect(seenA.has(a), `${u.name}: ability "${a}" is never shown`).toBe(true)
    }
  })

  it('makes the default loadout match the unit composition line', () => {
    for (const u of army.units) {
      const comp = u.datasheet?.composition ?? ''
      const items = comp.split(' - ').slice(1).join(' - ').replace(/\.$/, '').split(';').map((s) => s.trim().replace(/^\d+\s+/, '')).filter(Boolean)
      const r = resolveSheet(u, u.sizes[0].models)
      const shown = [...r.ranged, ...r.melee].map((w) => w.name)
      const shownAll = [...shown, ...r.abilities.map((a) => a.name)]
      const matches = (item: string, n: string) => n === item || n.startsWith(item + ' ') || n.startsWith(item.replace(/s$/, ''))
      for (const item of items) expect(shownAll.some((n) => matches(item, n)), `${u.name}: composition item "${item}" not in the default sheet`).toBe(true)
      for (const w of shown) expect(items.some((item) => matches(item, w)), `${u.name}: default sheet shows "${w}" which the composition omits`).toBe(true)
    }
  })

  it('keeps every enumerated loadout legal', () => {
    for (const u of withSlots) for (const s of u.sizes) for (const l of enumerateLoadouts(u, s.models)) {
      expect(normalizeLoadout(u, s.models, l), `${u.name}`).toEqual(l)
      for (const slot of u.slots!) {
        const counts = slotCounts(slot, s.models, l)
        expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(s.models)
        for (const n of Object.values(counts)) expect(n).toBeGreaterThanOrEqual(0)
        for (const [id, max] of Object.entries(slot.limit ?? {})) expect(counts[id]).toBeLessThanOrEqual(max)
      }
      const r = resolveSheet(u, s.models, l)
      for (const w of [...r.ranged, ...r.melee]) expect(w.count).toBeGreaterThan(0)
    }
  })
})

describe('loadout behaviour', () => {
  it('Custodian Wardens: 1 axe on 3 models gives Guardian Spear x2 and Castellan Axe x1', () => {
    const w = unit('Custodian Wardens')
    const l = setChoiceCount(w, 3, undefined, 'melee', 'axe', 1)
    const r = resolveSheet(w, 3, l)
    expect(rowNames(r.ranged)).toEqual(['Castellan Axe x1', 'Guardian Spear x2'])
    expect(rowNames(r.melee)).toEqual(['Castellan Axe x1', 'Guardian Spear x2'])
    expect(r.abilities.map((a) => a.name)).not.toContain('Vexilla')
    expect(loadoutSummary(w, 3, l)).toEqual(['Castellan Axe'])
  })

  it('hides a weapon completely when no model carries it', () => {
    const w = unit('Custodian Wardens')
    const all = setChoiceCount(w, 2, undefined, 'melee', 'axe', 2)
    expect(rowNames(resolveSheet(w, 2, all).melee)).toEqual(['Castellan Axe x2'])
  })

  it('Vexilla: at most one, and only shown when carried', () => {
    const g = unit('Custodian Guard Sodality')
    expect(resolveSheet(g, 3).abilities.map((a) => a.name)).not.toContain('Vexilla')
    const two = setChoiceCount(g, 3, undefined, 'vexilla', 'vexilla', 2)
    expect(two.vexilla.vexilla).toBe(1)
    expect(resolveSheet(g, 3, two).abilities.map((a) => a.name)).toContain('Vexilla')
    expect(headroom(g, g.slots![0], 'vexilla', 3, two)).toBe(0)
  })

  it('a slot can never hand out more than the unit has models (Gyrfalcon, 2 models)', () => {
    const g = unit('Gyrfalcon Jetbike Sodality')
    let l = setChoiceCount(g, 2, undefined, 'gun', 'devastator', 2)
    l = setChoiceCount(g, 2, l, 'gun', 'volley', 2)
    expect(l.gun).toEqual({ devastator: 2 })
    expect(rowNames(resolveSheet(g, 2, l).ranged)).toEqual(['Adrathic Devastator x2'])
  })

  it('re-clamps when the unit shrinks (Wardens 3 models with 2 axes -> 2 models)', () => {
    const w = unit('Custodian Wardens')
    const three = setChoiceCount(w, 3, undefined, 'melee', 'axe', 3)
    expect(normalizeLoadout(w, 2, three).melee).toEqual({ axe: 2 })
  })

  it('drops unknown ids from stale saved data', () => {
    const w = unit('Custodian Wardens')
    expect(normalizeLoadout(w, 3, { melee: { nonsense: 2 }, gone: { x: 1 } })).toEqual({})
  })

  it('Telemon: the standard loadout has two projectors and Dual Caestus Fists; each swap has exactly one heavy weapon', () => {
    const t = unit('Telemon Heavy Dreadnought')
    const std = resolveSheet(t, 1)
    expect(rowNames(std.ranged)).toContain('Twin Neutronium Cascade Projectors x2')
    expect(rowNames(std.melee)).toEqual(['Dual Caestus Fists x1'])
    for (const heavy of ['desolator', 'storm-cannon', 'culverin']) {
      const r = resolveSheet(t, 1, selectChoice(t, 1, undefined, 'loadout', heavy))
      expect(rowNames(r.melee)).toEqual(['Caestus Fist x1'])
      expect(rowNames(r.ranged)).toContain('Twin Neutronium Cascade Projectors x1')
      const heavies = r.ranged.filter((w) => ['Adrathic Desolator', 'Arachnus Storm Cannon', 'Iliastus Accelerator Culverin'].includes(w.name))
      expect(heavies).toHaveLength(1)
    }
  })

  it('Contemptor-Achillus swaps both guns together', () => {
    const a = unit('Contemptor-Achillus Dreadnought')
    const r = resolveSheet(a, 1, selectChoice(a, 1, undefined, 'guns', 'combi'))
    expect(rowNames(r.ranged)).toContain('Adrathic Combi-destructor x2')
    expect(r.ranged.map((w) => w.name)).not.toContain('Lastrum Storm Bolter')
  })

  it('Knight-Centura: swapping the Greatblade brings a Gun Stock and drops the blade', () => {
    const k = unit('Knight-Centura')
    expect(rowNames(resolveSheet(k, 1).melee)).toEqual(['Executioner Greatblade x1'])
    const r = resolveSheet(k, 1, selectChoice(k, 1, undefined, 'weapon', 'flamer'))
    expect(rowNames(r.melee)).toEqual(['Gun Stock x1'])
    expect(rowNames(r.ranged)).toEqual(['Master-crafted Flamer x1'])
  })

  it('Shield-Captain: the shield only comes with the Pyrithite Spear or Paragon Blade', () => {
    const s = unit('Shield-Captain')
    const has = (loadout: string) => resolveSheet(s, 1, selectChoice(s, 1, undefined, 'loadout', loadout))
    expect(has('spear-shield').abilities.map((a) => a.name)).toContain('Praesidium Shield')
    expect(has('blade-shield').abilities.map((a) => a.name)).toContain('Praesidium Shield')
    expect(has('axe').abilities.map((a) => a.name)).not.toContain('Praesidium Shield')
    expect(has('guardian').abilities.map((a) => a.name)).not.toContain('Praesidium Shield')
    expect(rowNames(resolveSheet(s, 1).melee)).toEqual(['Pyrithite Spear x1'])
    expect(loadoutPoints(s, 1)).toBe(25)
    expect(loadoutPoints(s, 1, selectChoice(s, 1, undefined, 'loadout', 'axe'))).toBe(0)
  })

  it('gives each wargear item its own sheet: weapon rows and/or ability text', () => {
    const s = unit('Shield-Captain')
    const choice = s.slots![0].choices[0] // Pyrithite Spear + Praesidium Shield
    const g = gearSheet(s, choice)
    expect(g.ranged.map((w) => w.name)).toEqual(['Pyrithite Spear'])
    expect(g.melee.map((w) => w.name)).toEqual(['Pyrithite Spear'])
    expect(g.abilities.map((a) => a.name)).toEqual(['Praesidium Shield'])
  })
})
