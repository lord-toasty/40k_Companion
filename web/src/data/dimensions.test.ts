import { describe, expect, it } from 'vitest'
import { DIMENSIONS, dimLabel, type Pt } from './dimensions'
import { BOARD, patterns } from './layouts'

const EPS = 0.05
const onSegment = (p: Pt, a: Pt, b: Pt) => {
  const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const len = Math.hypot(b[0] - a[0], b[1] - a[1])
  if (Math.abs(cross) / (len || 1) > EPS) return false
  const dot = (p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])
  return dot >= -EPS && dot <= len * len + EPS
}
const onBoardEdge = ([x, y]: Pt) => x === 0 || y === 0 || x === BOARD.width || y === BOARD.height
const onCentre = ([x, y]: Pt) => x === BOARD.width / 2 || y === BOARD.height / 2
const onZoneEdge = (p: Pt, id: string) =>
  patterns[id].zones.some((z) => z.points.some((a, i) => onSegment(p, a, z.points[(i + 1) % z.points.length])))

describe('deployment measurements', () => {
  it('has measurements for every deployment pattern', () => {
    for (const id of Object.keys(patterns)) expect(DIMENSIONS[id], id).toBeDefined()
  })

  it('measures from a board edge or the centre to a real zone edge', () => {
    for (const [id, dims] of Object.entries(DIMENSIONS)) {
      for (const d of dims) {
        const [start, end] = [d.a, d.b]
        // one end sits on the board edge / centre, the other on the zone boundary (or both on a zone/board edge)
        expect(onBoardEdge(start) || onCentre(start), `${id} ${start}`).toBe(true)
        expect(onZoneEdge(end, id) || onBoardEdge(end) || onCentre(end), `${id} ${end}`).toBe(true)
      }
    }
  })

  it('matches the numbers printed on the original deployment pictures', () => {
    const labels = (id: string) => DIMENSIONS[id].map(dimLabel)
    expect(labels('tipping-point')).toEqual(['12"', '20"', '20"', '12"'])
    expect(labels('hammer-and-anvil')).toEqual(['18"', '18"'])
    expect(labels('sweeping-engagement')).toEqual(['8"', '14"', '14"', '8"'])
    expect(labels('dawn-of-war')).toEqual(['12"', '12"'])
    expect(labels('search-and-destroy').filter((l) => l === '9"')).toHaveLength(2)
  })

  it('uses dimensions that agree with the zone polygons', () => {
    // each interior zone edge measured must really be that far from the board edge
    const tp = patterns['tipping-point'].zones.find((z) => z.player === 'defender')!.points
    expect(Math.max(...tp.map(([x]) => x))).toBe(20)
    const sw = patterns['sweeping-engagement'].zones.find((z) => z.player === 'attacker')!.points
    expect(Math.max(...sw.map(([, y]) => y))).toBe(14)
  })
})
