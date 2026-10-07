import { armies } from '../armies'
import type { Loadout, Roster, RosterEntry } from '../schema/army'
import { sizeOf } from '../schema/army'
import { blank, useBuilder } from '../store/builder'
import { normalizeLoadout } from './loadout'

/** Format marker. A new prefix (K2.) can change the encoding later without breaking old codes. */
const PREFIX = 'K1.'

// entry: [unitId, sizeKey, loadout | 0, enhancementId | 0, index of the unit it leads | -1]
type Wire = [string, string, Loadout | 0, string | 0, number]
interface Payload {
  a: string
  n: string
  l: number
  d: string[]
  p?: string
  t: string
  e: Wire[]
}

const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) => {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream)
  return new Uint8Array(await new Response(out).arrayBuffer())
}

const toB64 = (b: Uint8Array) => {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

export async function encodeRoster(r: Roster): Promise<string> {
  const index = new Map(r.entries.map((e, i) => [e.uid, i]))
  const p: Payload = {
    a: r.armyId,
    n: r.name,
    l: r.limit,
    d: r.detachmentIds,
    p: r.disposition,
    t: r.notes,
    e: r.entries.map((e) => [e.unitId, e.sizeKey, e.loadout && Object.keys(e.loadout).length ? e.loadout : 0, e.enhancementId ?? 0, e.leading ? (index.get(e.leading) ?? -1) : -1]),
  }
  return PREFIX + toB64(await pipe(new TextEncoder().encode(JSON.stringify(p)), new CompressionStream('deflate-raw')))
}

/** The code inside a bare code, or a share link (`...#/builder?l=CODE`). */
export function extractCode(text: string): string {
  const t = text.trim()
  const m = /[?&]l=([^&#\s]+)/.exec(t)
  return decodeURIComponent(m ? m[1] : t)
}

export const shareLink = async (r: Roster) => `${location.origin}${location.pathname}#/builder?l=${await encodeRoster(r)}`

export interface Decoded {
  roster: Roster
  skipped: number // entries dropped because their unit no longer exists
}

export async function decodeRoster(text: string): Promise<Decoded> {
  const code = extractCode(text)
  if (!code.startsWith(PREFIX)) throw new Error("That doesn't look like a list code.")
  let p: Payload
  try {
    p = JSON.parse(new TextDecoder().decode(await pipe(fromB64(code.slice(PREFIX.length)), new DecompressionStream('deflate-raw'))))
  } catch {
    throw new Error('That code is damaged or cut off.')
  }
  const army = armies[p?.a]
  if (!army || !Array.isArray(p.e)) throw new Error('That code is for an army this site does not have.')

  const kept = p.e.map((w, i) => ({ w, i, unit: Array.isArray(w) ? army.units.find((u) => u.id === w[0]) : undefined }))
  const uid = new Map<number, string>()
  for (const k of kept) if (k.unit) uid.set(k.i, crypto.randomUUID())
  const enhancements = new Set(army.detachments.flatMap((d) => d.enhancements.map((e) => e.id)))

  const entries: RosterEntry[] = kept.flatMap(({ w, i, unit }) => {
    if (!unit) return []
    const size = sizeOf(unit, String(w[1]))
    return [{
      uid: uid.get(i)!,
      unitId: unit.id,
      sizeKey: size.key,
      loadout: w[2] ? normalizeLoadout(unit, size.models, w[2]) : undefined,
      enhancementId: typeof w[3] === 'string' && enhancements.has(w[3]) ? w[3] : undefined,
      leading: w[4] >= 0 ? uid.get(w[4]) : undefined,
    }]
  })

  const roster: Roster = {
    ...blank(army.id),
    name: typeof p.n === 'string' ? p.n : 'Imported List',
    limit: typeof p.l === 'number' ? p.l : 2000,
    detachmentIds: (Array.isArray(p.d) ? p.d : []).filter((id) => army.detachments.some((d) => d.id === id)),
    disposition: p.p as Roster['disposition'],
    notes: typeof p.t === 'string' ? p.t : '',
    entries,
  }
  return { roster, skipped: kept.filter((k) => !k.unit).length }
}

/** Import whatever the user gave us: a list code, a share link, or the text of a JSON export. */
export async function importAny(text: string): Promise<{ added: number; skipped: number; name: string }> {
  const t = text.trim()
  const { addLists, importLists } = useBuilder.getState()
  if (t.startsWith('{') || t.startsWith('[')) {
    const n = importLists(t)
    return { added: n, skipped: 0, name: n === 1 ? useBuilder.getState().rosters[useBuilder.getState().activeId].name : `${n} lists` }
  }
  const { roster, skipped } = await decodeRoster(t)
  addLists([roster])
  return { added: 1, skipped, name: roster.name }
}
