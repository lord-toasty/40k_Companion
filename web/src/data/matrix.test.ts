import { describe, expect, it } from 'vitest'
import missions from './missions.json'
import { DISPOSITIONS, MATRIX, primaryFor, primaryId } from './matrix'

describe('disposition matrix', () => {
  it('reads column = own disposition, row = opponent', () => {
    expect(primaryFor('Purge the Foe', 'Take and Hold')).toBe('Unstoppable Force')
    expect(primaryFor('Purge the Foe', 'Purge the Foe')).toBe('Meatgrinder')
    expect(primaryFor('Take and Hold', 'Purge the Foe')).toBe('Immovable Object')
    expect(primaryFor('Disruption', 'Priority Assets')).toBe('Locate and Deny')
    expect(primaryFor('Disruption', 'Disruption')).toBe('Outmanoeuvre')
  })
  it('has 25 unique primaries that all exist in missions.json', () => {
    const names = DISPOSITIONS.flatMap((m) => DISPOSITIONS.map((o) => MATRIX[m][o]))
    expect(new Set(names).size).toBe(25)
    const ids = new Set(missions.map((m) => m.id))
    for (const n of names) expect(ids.has(primaryId(n))).toBe(true)
  })
  it('agrees with the printed card data (group and OPPONENT footer)', () => {
    for (const mine of DISPOSITIONS) {
      for (const opp of DISPOSITIONS) {
        const card = missions.find((m) => m.id === primaryId(MATRIX[mine][opp]))
        expect(card, `${mine} vs ${opp}`).toBeDefined()
        expect(card!.group).toBe(mine)
        expect(card!.opponent).toBe(opp)
        expect(card!.mirror).toBe(mine === opp)
      }
    }
  })
})
