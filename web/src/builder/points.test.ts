import { describe, expect, it } from 'vitest'
import type { Army, Roster } from '../schema/army'
import { datasheetFor } from '../schema/army'
import { defaultEntryPrice, detachmentBudget, dispositionOptions, enhancementLimit, entryPoints, exportText, isLeader, leadersOf, leadTargets, pointsFor, rosterPoints, validate } from './points'

const army: Army = {
  id: 't',
  name: 'T',
  detachmentPoints: 3,
  units: [
    {
      id: 'u',
      name: 'U',
      role: 'Character',
      maxPerList: 5,
      sizes: [{ key: 'a', models: 1, points: [100, 120, 140] }],
      slots: [{ id: 's', label: 'Gear', choices: [{ id: 'plain', label: 'Plain', gear: [] }, { id: 'fancy', label: 'Fancy', gear: [], points: 10 }] }],
    },
    { id: 'v', name: 'V', role: 'Infantry', sizes: [{ key: 'a', models: 1, points: [50] }], datasheet: { keywords: ['Infantry'] } },
    { id: 'w', name: 'W', role: 'Vehicle', sizes: [{ key: 'a', models: 1, points: [90] }], datasheet: { keywords: ['Vehicle', 'Walker'] } },
  ],
  detachments: [
    { id: 'd', name: 'D', dp: 2, unique: { group: 'Host', text: '' }, enhancements: [{ id: 'e', name: 'E', points: 25 }, { id: 'e2', name: 'E2', points: 5 }, { id: 'e3', name: 'E3', points: 10 }, { id: 'up', name: 'Up', points: 15, upgrade: { maxUnits: 2, anyKeywords: ['Infantry'] } }, { id: 'solo', name: 'Solo', points: 20, upgrade: { maxUnits: 1, allKeywords: ['Walker'] } }] },
    { id: 'd2', name: 'D2', dp: 2, unique: { group: 'Host', text: '' }, enhancements: [] },
  ],
}
const entry = (uid: string, unitId = 'u', enhancementId?: string) => ({ uid, unitId, sizeKey: 'a', enhancementId })
const roster = (entries: Roster['entries'], dets = ['d'], limit = 2000): Roster => ({ armyId: 't', name: 'r', limit, detachmentIds: dets, notes: '', entries })

describe('points', () => {
  it('uses the cost of the nth copy of a datasheet, repeating the last value', () => {
    expect(pointsFor([100, 120, 140], 1)).toBe(100)
    expect(pointsFor([100, 120, 140], 3)).toBe(140)
    expect(pointsFor([100, 120, 140], 6)).toBe(140)
    const r = roster([entry('1'), entry('2'), entry('3')])
    expect(r.entries.map((e) => entryPoints(army, e, r))).toEqual([100, 120, 140])
    expect(rosterPoints(army, r)).toBe(360)
  })
  it('adds loadout and enhancement points', () => {
    const r = roster([{ ...entry('1', 'u', 'e'), loadout: { s: { fancy: 1 } } }])
    expect(rosterPoints(army, r)).toBe(135)
  })
  it('prices the catalogue entry from the default loadout', () => {
    expect(defaultEntryPrice(army.units[0], army.units[0].sizes[0], 2)).toBe(120)
  })
  it('flags over limit, duplicate enhancement, detachment points and unique groups', () => {
    const v = validate(army, roster([entry('1', 'u', 'e'), entry('2', 'u', 'e')], ['d', 'd2'], 200))
    expect(v).toContain('Over limit by 70 pts') // (100 + 25) + (120 + 25) = 270 against a 200 limit
    expect(v).toContain('Duplicate enhancement')
    expect(v).toContain('Detachment points 4/2') // a 200 pt game is under the 1000 pt Incursion line
    expect(v).toContain('Only one Host detachment allowed')
  })
  it('allows 2 detachment points at 1000 pts or less and 3 above', () => {
    const dets = ['d', 'd2']
    expect(detachmentBudget(army, 500)).toBe(2)
    expect(detachmentBudget(army, 1000)).toBe(2)
    expect(detachmentBudget(army, 1001)).toBe(3)
    expect(detachmentBudget(army, 2000)).toBe(3)
    expect(validate(army, roster([entry('1')], dets, 2000))).toContain('Detachment points 4/3')
  })
  it('caps enhancements (2 at 1000 pts or less) and limits them to Characters', () => {
    const three = roster([entry('1', 'u', 'e'), entry('2', 'u', 'e2'), entry('3', 'u', 'e3'), entry('4', 'v', 'e')], ['d'], 1000)
    const v = validate(army, three)
    expect(v).toContain('Enhancements 3/2')
    expect(v).toContain("V can't take E: Only Characters can take this enhancement")
    expect(v).toContain('Duplicate enhancement')
  })
  it('lets non-Characters take upgrades; one upgrade on several units is one slot and each unit pays', () => {
    const r = roster([entry('1', 'v', 'up'), entry('2', 'v', 'up'), entry('3', 'u', 'e')], ['d'], 1000)
    expect(validate(army, r).filter((i) => /Enhancement|Upgrade|Up|can't/.test(i))).toEqual([]) // 2 slots of 2, no complaints
    expect(r.entries.map((e) => entryPoints(army, e, r))).toEqual([50 + 15, 50 + 15, 100 + 25])
  })
  it('limits an upgrade to its max units, its keywords and non-Characters', () => {
    const over = roster([entry('1', 'v', 'up'), entry('2', 'v', 'up'), entry('3', 'v', 'up')])
    expect(validate(army, over)).toContain('Up: max 2 units')
    expect(validate(army, roster([entry('1', 'w', 'up')]))).toContain("W can't take Up: Infantry units only")
    expect(validate(army, roster([entry('1', 'u', 'up')]))).toContain("U can't take Up: Infantry units only") // keywords still apply to Characters
    expect(validate(army, roster([entry('1', 'w', 'solo'), entry('2', 'w', 'solo')]))).toContain('Solo: max 1 unit')
    expect(validate(army, roster([entry('1', 'w', 'solo')]))).toEqual([])
  })
  it('an upgrade on a Character is once per army; on non-Characters it is shared up to its limit', () => {
    const c = { ...army.units[0], datasheet: { keywords: ['Infantry', 'Character'] } }
    const a2: Army = { ...army, units: [c, ...army.units.slice(1)] }
    // Character + Character: once per army
    expect(validate(a2, roster([entry('1', 'u', 'up'), entry('2', 'u', 'up')]))).toContain('Up: on a Character, so only 1 use allowed')
    // Character + a non-Character unit: also once per army
    expect(validate(a2, roster([entry('1', 'u', 'up'), entry('2', 'v', 'up')]))).toContain('Up: on a Character, so only 1 use allowed')
    // a Character on its own is fine, and so are two non-Characters
    expect(validate(a2, roster([entry('1', 'u', 'up')]))).toEqual([])
    expect(validate(a2, roster([entry('1', 'v', 'up'), entry('2', 'v', 'up')]))).toEqual([])
    const r = roster([entry('1', 'v', 'up')])
    expect(enhancementLimit(a2, army.detachments[0].enhancements[3], r.entries, false)).toBe(2)
    expect(enhancementLimit(a2, army.detachments[0].enhancements[3], r.entries, true)).toBe(1)
    expect(enhancementLimit(a2, army.detachments[0].enhancements[3], [{ ...entry('9', 'u', 'up') }], false)).toBe(1)
  })
  it('datasheet defaults to zeros', () => {
    expect(datasheetFor(army.units[0]).stats.T).toBe('0')
  })
})

describe('dispositions', () => {
  it('offers the union of the selected detachments dispositions in standard order', () => {
    const a: Army = { ...army, detachments: [
      { ...army.detachments[0], dispositions: ['Priority Assets', 'Purge the Foe'] },
      { ...army.detachments[1], dispositions: ['Take and Hold'] },
    ] }
    expect(dispositionOptions(a, roster([], []))).toEqual([])
    expect(dispositionOptions(a, roster([], ['d']))).toEqual(['Purge the Foe', 'Priority Assets'])
    expect(dispositionOptions(a, roster([], ['d', 'd2']))).toEqual(['Purge the Foe', 'Take and Hold', 'Priority Assets'])
  })
})

describe('leaders', () => {
  const a2: Army = { ...army, units: [{ ...army.units[0], datasheet: { core: ['Leader'] } }, ...army.units.slice(1)] }
  const led = (uid: string, unitId: string, leading?: string) => ({ ...entry(uid, unitId), leading })

  it('only Leader characters can attach, and only to non-Character Infantry units', () => {
    expect(isLeader(a2.units[0])).toBe(true)
    expect(isLeader(a2.units[1])).toBe(false)
    const r = roster([entry('v1', 'v'), entry('c1', 'u'), entry('t1', 'w')])
    expect(leadTargets(a2, r, a2.units[0]).map((e) => e.uid)).toEqual(['v1']) // not the Character, not the Vehicle
    expect(validate(a2, roster([entry('v1', 'v'), led('c1', 'u', 'v1')]))).toEqual([])
    expect(validate(a2, roster([entry('v1', 'v'), entry('v2', 'v'), led('x', 'v', 'v2')]))).toContain("V can't lead a unit")
    expect(validate(a2, roster([entry('t1', 'w'), led('c1', 'u', 't1')]))).toContain("U is attached to a unit it can't lead")
  })

  it('allows one Character per unit', () => {
    const r = roster([entry('v1', 'v'), led('c1', 'u', 'v1'), led('c2', 'u', 'v1')])
    expect(leadersOf(r, 'v1').map((e) => e.uid)).toEqual(['c1', 'c2'])
    expect(validate(a2, r)).toContain('V: only one Character can lead it')
  })

  it('shows who leads in the export text', () => {
    const r = roster([entry('v1', 'v'), led('c1', 'u', 'v1')])
    expect(exportText(a2, r)).toContain('  - Leading: V')
  })
})
