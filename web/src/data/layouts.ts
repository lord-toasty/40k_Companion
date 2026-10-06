import data from './layouts.json'
import { slug, type Disposition } from './matrix'

type Pt = [number, number]
export interface Wall { p: Pt[]; k: number }
export interface Piece { t: 'area' | 'feature'; c?: 'light' | 'dense'; v: Pt[]; w?: Wall[] }
export interface Zone { player: 'attacker' | 'defender'; color: string; points: Pt[] }
export interface Pattern { name: string; description: string; zones: Zone[]; objectives: Pt[] }
export interface Layout {
  variant: number
  name: string
  deployment: string
  objectives: Pt[]
  pieces: Piece[]
}

export const BOARD = data.board as { width: number; height: number }
// the JSON types coordinates as number[][]; they are always [x, y] pairs
export const patterns = data.patterns as unknown as Record<string, Pattern>
const layouts = data.layouts as unknown as Record<string, Layout[]>

const ORDER = ['take-and-hold', 'disruption', 'purge-the-foe', 'priority-assets', 'reconnaissance']

/** Layouts are shared by an unordered pair of dispositions (A vs B is the same board as B vs A). */
export function layoutsFor(a: Disposition, b: Disposition): Layout[] {
  const key = [slug(a), slug(b)].sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).join('|')
  return layouts[key] ?? []
}
