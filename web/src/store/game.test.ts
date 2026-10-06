import { beforeEach, describe, expect, it } from 'vitest'
import { CAPS, useGame, vpRoom, vpWarning } from './game'

const s = () => useGame.getState()

describe('VP caps', () => {
  beforeEach(() => s().newGame())

  it('caps secondaries at 15 per round', () => {
    for (let i = 0; i < 20; i++) s().adjustVp('attacker', 'secondaryVp', 1)
    expect(s().players.attacker.secondaryVp[0]).toBe(CAPS.secondaryRound)
    expect(vpWarning(s().players.attacker, 'secondaryVp', 1, 1)).toMatch(/per round/)
  })

  it('caps secondaries at 45 per game and primary at 50', () => {
    for (let r = 1; r <= 5; r++) {
      s().setRound(r)
      for (let i = 0; i < 20; i++) s().adjustVp('attacker', 'secondaryVp', 1)
      for (let i = 0; i < 60; i++) s().adjustVp('attacker', 'primaryVp', 1)
    }
    const p = s().players.attacker
    expect(p.secondaryVp.reduce((a, b) => a + b, 0)).toBe(CAPS.secondaryGame)
    expect(p.primaryVp.reduce((a, b) => a + b, 0)).toBe(CAPS.primaryGame)
    expect(vpRoom(p, 'secondaryVp', 5)).toBe(0)
  })

  it('refuses a secondary score that would pass the round cap', () => {
    const add = (id: string) => { s().addSecondary('attacker', id); return s().players.attacker.hand.at(-1)!.uid }
    s().scoreSecondary('attacker', add('a'), 10)
    const b = add('b')
    s().scoreSecondary('attacker', b, 6)
    expect(s().players.attacker.secondaryVp[0]).toBe(10)
    expect(s().players.attacker.hand.map((h) => h.id)).toEqual(['b']) // refused: stays in hand
    s().scoreSecondary('attacker', b, 5)
    expect(s().players.attacker.secondaryVp[0]).toBe(15)
  })
})

describe('secondary piles', () => {
  beforeEach(() => s().newGame())
  const add = (id: string) => { s().addSecondary('attacker', id); return s().players.attacker.hand.at(-1)!.uid }

  it('scoring moves the card to Achieved with its round, discarding to Discarded', () => {
    s().setRound(2)
    s().scoreSecondary('attacker', add('a'), 3)
    s().discardSecondary('attacker', add('b'))
    const p = s().players.attacker
    expect(p.hand).toHaveLength(0)
    expect(p.achieved).toMatchObject([{ id: 'a', round: 2, vp: 3 }])
    expect(p.discarded).toMatchObject([{ id: 'b', round: 2 }])
    expect(s().players.defender.achieved).toHaveLength(0) // piles are per player
  })

  it('returns a card to hand and keeps it from being drawn twice', () => {
    s().scoreSecondary('attacker', add('a'), 2)
    const uid = s().players.attacker.achieved[0].uid
    s().returnToHand('attacker', 'achieved', uid)
    const p = s().players.attacker
    expect(p.achieved).toHaveLength(0)
    expect(p.hand).toMatchObject([{ id: 'a', vp: 2 }])
  })
})
