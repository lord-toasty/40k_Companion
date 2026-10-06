import { describe, expect, it } from 'vitest'
import type { Army } from '../../schema/army'
import { armies } from '../index'
import { ROLES } from '../../schema/army'
import { entryPoints, rosterPoints, upgradeBlock } from '../../builder/points'
import { resolveSheet, withEnhancement } from '../../builder/loadout'

const a: Army = armies.custodes
const unit = (name: string) => a.units.find((u) => u.name === name)!

describe('Custodes data', () => {
  it('has all 27 datasheets, 13 detachments and 29 enhancements', () => {
    expect(a.units).toHaveLength(27)
    expect(a.detachments).toHaveLength(13)
    expect(a.detachments.flatMap((d) => d.enhancements)).toHaveLength(29)
  })
  it('gives every unit a role the builder knows, size options and a datasheet', () => {
    for (const u of a.units) {
      expect(ROLES, u.name).toContain(u.role)
      expect(u.sizes.length, u.name).toBeGreaterThan(0)
      expect(u.datasheet?.stats?.T, u.name).toBeTruthy()
    }
  })
  it('gives every detachment a rule, stratagems and priced enhancements', () => {
    for (const d of a.detachments) {
      expect(d.stratagems?.length, d.name).toBeGreaterThan(0)
      expect(d.enhancements.every((e) => e.points > 0 && e.text), d.name).toBe(true)
    }
  })
  it('matches spot-checked values from the points table', () => {
    expect(unit('Trajann Valoris').sizes[0].points).toEqual([265])
    expect(unit('Trajann Valoris').maxPerList).toBe(1)
    expect(unit('Custodian Wardens').sizes.map((s) => s.points[0])).toEqual([200, 295])
    expect(unit('Shield-Captain').sizes.map((s) => s.points)).toEqual([[180, 200, 200]])
    expect(unit('Anathema Psykana Rhino').sizes[0].points).toEqual([70, 70, 70, 80])
    expect(a.detachments.find((d) => d.name === "Emperor's Chosen")!.enhancements.map((e) => e.points)).toEqual([40, 15])
  })
  it('costs 3 DP for Guardians of the Throne and 1 DP for every other detachment', () => {
    for (const d of a.detachments) expect(d.dp, d.name).toBe(d.name === 'Guardians of the Throne' ? 3 : 1)
  })
  it('prices the Shield-Captain by loadout: 205/225/225 with the shield, 180/200/200 for axe or Guardian Spear', () => {
    const u = unit('Shield-Captain')
    const price = (loadout?: Record<string, Record<string, number>>) => {
      const entries = [1, 2, 3].map((i) => ({ uid: String(i), unitId: u.id, sizeKey: '1', loadout }))
      const roster = { armyId: 'custodes', name: 'x', limit: 2000, detachmentIds: [], entries, notes: '' }
      return entries.map((e) => entryPoints(a, e, roster))
    }
    expect(price()).toEqual([205, 225, 225]) // default: Pyrithite Spear + Praesidium Shield
    expect(price({ loadout: { 'blade-shield': 1 } })).toEqual([205, 225, 225])
    expect(price({ loadout: { axe: 1 } })).toEqual([180, 200, 200])
    expect(price({ loadout: { guardian: 1 } })).toEqual([180, 200, 200])
  })
  it('prices the 2nd and 3rd copy of a datasheet from the later columns', () => {
    const u = unit('Custodian Wardens')
    const entries = [1, 2, 3].map((i) => ({ uid: String(i), unitId: u.id, sizeKey: '2' }))
    const roster = { armyId: 'custodes', name: 'x', limit: 2000, detachmentIds: [], entries, notes: '' }
    expect(entries.map((e) => entryPoints(a, e, roster))).toEqual([200, 230, 230])
    expect(rosterPoints(a, roster)).toBe(660)
  })

  it('tags the six upgrades and restricts them to the right units', () => {
    const enh = (name: string) => a.detachments.flatMap((d) => d.enhancements).find((e) => e.name === name)!
    const ups = a.detachments.flatMap((d) => d.enhancements).filter((e) => e.upgrade)
    expect(ups.map((e) => e.name).sort()).toEqual(['Anti-Gravitic Mobility', 'Augury Uplink', 'Auric Eagle', 'Celeritius Sentries', 'Combat Deployment', 'Memento Moritoi'])
    const ok = (e: string, u: string) => upgradeBlock(enh(e), unit(u)) === null
    // Infantry/Mounted, not Terminators; Characters are allowed when they match
    expect(ok('Auric Eagle', 'Custodian Wardens')).toBe(true)
    expect(ok('Auric Eagle', 'Vertus Praetors')).toBe(true)
    expect(ok('Auric Eagle', 'Allarus Custodians')).toBe(false)
    expect(ok('Auric Eagle', 'Shield-Captain')).toBe(true)
    expect(ok('Auric Eagle', 'Shield-Captain in Allarus Terminator Armour')).toBe(false)
    expect(ok('Auric Eagle', 'Caladius Grav-tank')).toBe(false)
    expect(ok('Celeritius Sentries', 'Custodian Guard Sodality')).toBe(true)
    expect(ok('Celeritius Sentries', 'Venatari with Kinetic Destroyers')).toBe(false)
    expect(ok('Anti-Gravitic Mobility', 'Pallas Grav-attack')).toBe(true)
    expect(ok('Combat Deployment', 'Coronus Grav-carrier')).toBe(true)
    expect(ok('Combat Deployment', 'Pallas Grav-attack')).toBe(false)
    expect(ok('Memento Moritoi', 'Telemon Heavy Dreadnought')).toBe(true)
    expect(ok('Memento Moritoi', 'Caladius Grav-tank')).toBe(false)
    expect(enh('Augury Uplink').upgrade!.maxUnits).toBe(1)
    expect(enh('Auric Eagle').upgrade!.maxUnits).toBe(3)
  })
})

describe('Custodes dispositions', () => {
  it('tags every detachment with the dispositions from the list', () => {
    const d = (name: string) => a.detachments.find((x) => x.name === name)?.dispositions
    expect(d('Guardians of the Throne')).toEqual(['Priority Assets', 'Purge the Foe'])
    expect(d('Aquilan Shield')).toEqual(['Take and Hold'])
    expect(d('Null Maiden Vigil')).toEqual(['Disruption'])
    expect(d('Grav-Assault Force')).toEqual(['Reconnaissance'])
    for (const x of a.detachments) expect(x.dispositions?.length, x.name).toBeGreaterThan(0)
  })
})

describe('Custodes enhancement restrictions', () => {
  const enh = (name: string) => a.detachments.flatMap((d) => d.enhancements).find((e) => e.name === name)!
  const ok = (e: string, u: string) => upgradeBlock(enh(e), unit(u)) === null
  it('limits Lightning Descent and Leonine Ferocity to the Terminator-armour Shield-Captain', () => {
    for (const e of ['Lightning Descent', 'Leonine Ferocity']) {
      expect(ok(e, 'Shield-Captain in Allarus Terminator Armour')).toBe(true)
      expect(ok(e, 'Shield-Captain')).toBe(false)
      expect(ok(e, 'Shield-Captain on Dawneagle Jetbike')).toBe(false)
      expect(ok(e, 'Blade Champion')).toBe(false)
    }
  })
  it('limits "Infantry models only", "Shield-Captain only" and Anathema Psykana enhancements', () => {
    expect(ok('Radiant Mantle', 'Blade Champion')).toBe(true)
    expect(ok('Radiant Mantle', 'Shield-Captain on Dawneagle Jetbike')).toBe(false) // Mounted
    expect(ok('Sally Forth', 'Shield-Captain')).toBe(true)
    expect(ok('Sally Forth', 'Blade Champion')).toBe(false)
    expect(ok('Oblivion Knight', 'Knight-Centura')).toBe(true)
    expect(ok('Oblivion Knight', 'Shield-Captain')).toBe(false)
  })
})

describe('Epic Heroes', () => {
  it("can't take enhancements or upgrades", () => {
    const all = a.detachments.flatMap((d) => d.enhancements)
    expect(all.length).toBeGreaterThan(0)
    for (const e of all) expect(upgradeBlock(e, unit('Trajann Valoris')), e.name).toBe("Epic Heroes can't take enhancements")
  })
})

describe('Auriferous Orb', () => {
  it("adds a ranged weapon and its ability to the bearer's sheet", () => {
    const orb = a.detachments.flatMap((d) => d.enhancements).find((e) => e.name === 'Auriferous Orb')!
    const cap = unit('Shield-Captain')
    const plain = resolveSheet(cap, 1)
    const sheet = withEnhancement(plain, orb)
    expect(plain.ranged.map((w) => w.name)).not.toContain('Auriferous Orb')
    const w = sheet.ranged.find((x) => x.name === 'Auriferous Orb')!
    expect([w.range, w.attacks, w.skill, w.strength, w.ap, w.damage]).toEqual(['12"', '3', '2+', '1', '0', '1'])
    expect(w.keywords).toEqual(['Anti-non-Monster/Vehicle 2+', 'Devastating Wounds'])
    expect(sheet.abilities.map((x) => x.name)).toContain('Auriferous Orb')
    expect(withEnhancement(plain, undefined)).toBe(plain)
  })
})
