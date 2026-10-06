import { describe, expect, it } from 'vitest'
import type { Army, Roster } from '../schema/army'
import { datasheetFor } from '../schema/army'
import { defaultEntryPrice, entryPoints, pointsFor, rosterPoints, validate } from './points'

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
    { id: 'v', name: 'V', role: 'Infantry', sizes: [{ key: 'a', models: 1, points: [50] }] },
  ],
  detachments: [
    { id: 'd', name: 'D', dp: 2, unique: { group: 'Host', text: '' }, enhancements: [{ id: 'e', name: 'E', points: 25 }, { id: 'e2', name: 'E2', points: 5 }] },
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
    expect(v).toContain('Detachment points 4/3')
    expect(v).toContain('Only one Host detachment allowed')
  })
  it('caps enhancements (2 at 1000 pts or less) and limits them to Characters', () => {
    const three = roster([entry('1', 'u', 'e'), entry('2', 'u', 'e2'), entry('3', 'v', 'e')], ['d'], 1000)
    const v = validate(army, three)
    expect(v).toContain('Enhancements 3/2')
    expect(v).toContain('V is not a Character and cannot take an enhancement')
  })
  it('datasheet defaults to zeros', () => {
    expect(datasheetFor(army.units[0]).stats.T).toBe('0')
  })
})
