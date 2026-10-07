import { describe, expect, it } from 'vitest'
import { armies } from '../armies'
import type { Roster } from '../schema/army'
import { useBuilder } from '../store/builder'
import { decodeRoster, encodeRoster, extractCode, importAny } from './share'

const army = armies['adeptus-custodes'] ?? Object.values(armies)[0]
const det = army.detachments.find((d) => d.enhancements.length)!
const base = (): Roster => ({
  armyId: army.id,
  name: 'Gold Host',
  limit: 2000,
  detachmentIds: [det.id],
  disposition: det.dispositions?.[0],
  notes: 'bring dice',
  entries: [
    { uid: 'a', unitId: 'custodian-wardens', sizeKey: '3', loadout: { melee: { axe: 1 } } },
    { uid: 'b', unitId: 'custodian-wardens', sizeKey: '3' },
    { uid: 'c', unitId: 'shield-captain', sizeKey: '1', leading: 'b', enhancementId: det.enhancements[0].id },
  ],
})

describe('share codes', () => {
  it('round-trips a list, including which duplicate unit a leader is attached to', async () => {
    const code = await encodeRoster(base())
    expect(code.startsWith('K1.')).toBe(true)
    const { roster, skipped } = await decodeRoster(code)
    expect(skipped).toBe(0)
    expect(roster).toMatchObject({ armyId: army.id, name: 'Gold Host', limit: 2000, notes: 'bring dice', detachmentIds: [det.id], disposition: base().disposition })
    expect(roster.entries.map((e) => e.unitId)).toEqual(['custodian-wardens', 'custodian-wardens', 'shield-captain'])
    expect(roster.entries[0].loadout).toEqual({ melee: { axe: 1 } })
    expect(roster.entries[2].enhancementId).toBe(det.enhancements[0].id)
    expect(roster.entries[2].leading).toBe(roster.entries[1].uid) // the second Wardens, not the first
    expect(roster.entries[0].uid).not.toBe('a')
  })

  it('accepts a bare code or a full share link', async () => {
    const code = await encodeRoster(base())
    const link = `https://example.com/app/#/builder?l=${code}`
    expect(extractCode(link)).toBe(code)
    expect((await decodeRoster(`  ${link}  `)).roster.name).toBe('Gold Host')
    expect((await decodeRoster(code)).roster.entries).toHaveLength(3)
  })

  it('rejects junk, wrong prefixes and damaged codes', async () => {
    await expect(decodeRoster('hello')).rejects.toThrow(/list code/)
    await expect(decodeRoster('K1.@@@@')).rejects.toThrow(/damaged/)
    const code = await encodeRoster(base())
    await expect(decodeRoster(code.slice(0, 20))).rejects.toThrow(/damaged/)
  })

  it('drops units that no longer exist and reports how many', async () => {
    const r = base()
    r.entries.splice(1, 0, { uid: 'x', unitId: 'removed-unit', sizeKey: '1' })
    r.entries[3].leading = 'x'
    const { roster, skipped } = await decodeRoster(await encodeRoster(r))
    expect(skipped).toBe(1)
    expect(roster.entries.map((e) => e.unitId)).not.toContain('removed-unit')
    expect(roster.entries.at(-1)?.leading).toBeUndefined()
  })

  it('keeps a typical list code short enough to paste', async () => {
    const r = base()
    r.entries = Array.from({ length: 30 }, (_, i) => ({ uid: String(i), unitId: i % 2 ? 'custodian-wardens' : 'shield-captain', sizeKey: i % 2 ? '3' : '1', loadout: i % 2 ? { melee: { axe: 1 } } : undefined }))
    const code = await encodeRoster(r)
    expect(code.length).toBeLessThan(1500)
  })

  it('imports a code as a new list and a JSON export too', async () => {
    const before = Object.keys(useBuilder.getState().rosters).length
    const r = await importAny(await encodeRoster(base()))
    expect(r).toMatchObject({ added: 1, skipped: 0, name: 'Gold Host' })
    expect(Object.keys(useBuilder.getState().rosters)).toHaveLength(before + 1)
    expect(useBuilder.getState().rosters[useBuilder.getState().activeId].name).toBe('Gold Host')
    const j = await importAny(JSON.stringify({ app: '40k-companion', version: 1, lists: [base()] }))
    expect(j.added).toBe(1)
    expect(Object.keys(useBuilder.getState().rosters)).toHaveLength(before + 2)
  })
})
