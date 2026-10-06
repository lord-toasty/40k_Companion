import { beforeEach, describe, expect, it } from 'vitest'
import { useBuilder } from './builder'

describe('builder store', () => {
  beforeEach(() => useBuilder.getState().reset())

  it('un-attaches a leader when the unit it leads is removed', () => {
    const b = () => useBuilder.getState()
    const roster = () => b().rosters[b().armyId]
    b().addEntry({ unitId: 'custodian-wardens', sizeKey: '3' })
    b().addEntry({ unitId: 'shield-captain', sizeKey: '1' })
    const [unit, leader] = roster().entries
    b().patchEntry(leader.uid, { leading: unit.uid })
    expect(roster().entries[1].leading).toBe(unit.uid)
    b().removeEntry(unit.uid)
    expect(roster().entries).toHaveLength(1)
    expect(roster().entries[0].leading).toBeUndefined()
  })
})
