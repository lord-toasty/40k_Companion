/**
 * Measurements between the board edges / centre and the deployment zone edges.
 * Board is 60" x 44", origin top-left, x right, y down. Terrain is eyeballed, so only zone geometry is measured.
 *
 * a -> b is the measured segment and lies on the board edge, centre line or zone boundary;
 * `inset` pushes the drawn arrow inwards so it does not sit on top of the board edge.
 * Checked against the original deployment pictures and the zone geometry (see dimensions.test.ts).
 */
export type Pt = [number, number]
export interface Dim { a: Pt; b: Pt; inset?: Pt }

export const dimLength = (d: Dim) => Math.round(Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) * 100) / 100
export const dimLabel = (d: Dim) => `${dimLength(d)}"`

export const DIMENSIONS: Record<string, Dim[]> = {
  'tipping-point': [
    { a: [0, 11], b: [12, 11] }, // defender, upper half
    { a: [0, 33], b: [20, 33] }, // defender, lower half
    { a: [60, 11], b: [40, 11] }, // attacker, upper half
    { a: [60, 33], b: [48, 33] }, // attacker, lower half
  ],
  'hammer-and-anvil': [
    { a: [0, 11], b: [18, 11] },
    { a: [60, 11], b: [42, 11] },
  ],
  'sweeping-engagement': [
    { a: [15, 0], b: [15, 8] }, // attacker, left half
    { a: [45, 0], b: [45, 14] }, // attacker, right half
    { a: [15, 44], b: [15, 30] }, // defender, left half
    { a: [45, 44], b: [45, 36] }, // defender, right half
  ],
  'dawn-of-war': [
    { a: [30, 0], b: [30, 12] },
    { a: [30, 44], b: [30, 32] },
  ],
  'crucible-of-battle': [
    { a: [0, 44], b: [30, 44], inset: [0, -1.5] }, // defender: how far the diagonal reaches along the bottom edge
    { a: [60, 0], b: [30, 0], inset: [0, 1.5] }, // attacker: how far it reaches along the top edge
  ],
  'search-and-destroy': [
    { a: [0, 44], b: [30, 44], inset: [0, -1.5] }, // defender quadrant, bottom edge to the centre line
    { a: [0, 44], b: [0, 22], inset: [1.5, 0] }, // defender quadrant, left edge to the centre line
    { a: [30, 22], b: [21, 22] }, // 9" centre exclusion ring, defender side
    { a: [60, 0], b: [30, 0], inset: [0, 1.5] },
    { a: [60, 0], b: [60, 22], inset: [-1.5, 0] },
    { a: [30, 22], b: [39, 22] }, // 9" centre exclusion ring, attacker side
  ],
}
