import { describe, expect, it } from 'vitest'
import { useBuilder } from './builder'

const b = () => useBuilder.getState()
const active = () => b().rosters[b().activeId]

describe('saved lists', () => {
  it('creates, switches and keeps lists independent', () => {
    const first = b().activeId
    b().update({ name: 'One' })
    b().newList()
    b().update({ name: 'Two' })
    expect(b().activeId).not.toBe(first)
    expect(b().rosters[first].name).toBe('One')
    b().switchList(first)
    expect(active().name).toBe('One')
  })

  it('duplicates with fresh unit ids and remapped leader links', () => {
    b().newList()
    b().addEntry({ unitId: 'custodian-wardens', sizeKey: '3' })
    b().addEntry({ unitId: 'shield-captain', sizeKey: '1' })
    const [u, l] = active().entries
    b().patchEntry(l.uid, { leading: u.uid })
    const src = b().activeId
    b().duplicateList()
    expect(b().activeId).not.toBe(src)
    const [cu, cl] = active().entries
    expect(cu.uid).not.toBe(u.uid)
    expect(cl.leading).toBe(cu.uid)
    expect(active().name).toMatch(/\(copy\)$/)
    b().removeEntry(cu.uid)
    expect(b().rosters[src].entries).toHaveLength(2)
  })

  it('deleting the active list opens another, and deleting the last leaves a blank one', () => {
    const ids = Object.keys(b().rosters)
    for (const id of ids) b().deleteList(id)
    expect(Object.keys(b().rosters)).toHaveLength(1)
    expect(active().entries).toEqual([])
    b().newList()
    const gone = b().activeId
    b().deleteList(gone)
    expect(b().rosters[gone]).toBeUndefined()
    expect(active()).toBeDefined()
  })

  it('round-trips an export and rejects junk', () => {
    b().addEntry({ unitId: 'shield-captain', sizeKey: '1' })
    b().update({ name: 'Keep me' })
    const json = JSON.stringify({ lists: [active()] })
    const before = Object.keys(b().rosters).length
    expect(b().importLists(json)).toBe(1)
    expect(Object.keys(b().rosters)).toHaveLength(before + 1)
    expect(active().name).toBe('Keep me')
    expect(() => b().importLists('{"lists":[{"armyId":"nope","entries":[]}]}')).toThrow()
    expect(() => b().importLists('not json')).toThrow()
  })
})
