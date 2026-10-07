import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Roster, RosterEntry } from '../schema/army'
import { armies, armyList } from '../armies'

export const blank = (armyId: string): Roster => ({ armyId, name: 'New List', limit: 2000, detachmentIds: [], entries: [], notes: '', updated: Date.now() })

const newId = () => crypto.randomUUID()

interface BuilderState {
  armyId: string // army of the active list
  activeId: string
  rosters: Record<string, Roster> // every saved list, by id
  setArmy: (id: string) => void
  switchList: (id: string) => void
  newList: () => void
  duplicateList: () => void
  deleteList: (id: string) => void
  /** Add lists from an exported file; returns how many were added. Throws on a file that isn't a list export. */
  importLists: (json: string) => number
  /** Add already-validated lists as new saved lists and open the last one. */
  addLists: (lists: Roster[]) => number
  update: (patch: Partial<Roster>) => void
  addEntry: (e: Omit<RosterEntry, 'uid'>) => void
  patchEntry: (uid: string, patch: Partial<RosterEntry>) => void
  removeEntry: (uid: string) => void
  reset: () => void
}

/** The most recently edited list for an army, if there is one. */
const latestFor = (rosters: Record<string, Roster>, armyId: string) =>
  Object.entries(rosters)
    .filter(([, r]) => r.armyId === armyId)
    .sort((a, b) => (b[1].updated ?? 0) - (a[1].updated ?? 0))[0]?.[0]

/** Check an imported object is a usable list; returns a clean copy or null. */
export function parseRoster(x: unknown): Roster | null {
  const r = x as Partial<Roster> | null
  if (!r || typeof r !== 'object' || !armies[r.armyId ?? ''] || !Array.isArray(r.entries)) return null
  const base = blank(r.armyId!)
  return {
    ...base,
    name: typeof r.name === 'string' ? r.name : base.name,
    limit: typeof r.limit === 'number' ? r.limit : base.limit,
    detachmentIds: Array.isArray(r.detachmentIds) ? r.detachmentIds.filter((d) => typeof d === 'string') : [],
    disposition: r.disposition,
    notes: typeof r.notes === 'string' ? r.notes : '',
    entries: r.entries.filter((e) => e && typeof e.unitId === 'string' && typeof e.sizeKey === 'string' && typeof e.uid === 'string'),
  }
}

const firstId = newId()

export const useBuilder = create<BuilderState>()(
  persist(
    (set, get) => {
      const mut = (fn: (r: Roster) => Roster) =>
        set((s) => {
          const cur = s.rosters[s.activeId] ?? blank(s.armyId)
          return { rosters: { ...s.rosters, [s.activeId]: { ...fn(cur), updated: Date.now() } } }
        })
      const open = (id: string, rosters: Record<string, Roster>) => ({ activeId: id, armyId: rosters[id].armyId, rosters })
      return {
        armyId: armyList[0].id,
        activeId: firstId,
        rosters: { [firstId]: blank(armyList[0].id) },
        setArmy: (armyId) => {
          const { rosters } = get()
          const id = latestFor(rosters, armyId)
          if (id) return set(open(id, rosters))
          const created = newId()
          set(open(created, { ...rosters, [created]: blank(armyId) }))
        },
        switchList: (id) => {
          const { rosters } = get()
          if (rosters[id]) set(open(id, rosters))
        },
        newList: () => {
          const { rosters, armyId } = get()
          const id = newId()
          set(open(id, { ...rosters, [id]: blank(armyId) }))
        },
        duplicateList: () => {
          const { rosters, activeId } = get()
          const src = rosters[activeId]
          if (!src) return
          const id = newId()
          // entries get fresh uids so the copy is fully independent; `leading` links are remapped to match
          const uids = new Map(src.entries.map((e) => [e.uid, newId()]))
          const entries = src.entries.map((e) => ({ ...e, uid: uids.get(e.uid)!, leading: e.leading ? uids.get(e.leading) : undefined }))
          set(open(id, { ...rosters, [id]: { ...src, name: `${src.name} (copy)`, entries, updated: Date.now() } }))
        },
        deleteList: (id) => {
          const { rosters, activeId, armyId } = get()
          if (!rosters[id]) return
          const rest = { ...rosters }
          delete rest[id]
          if (!Object.keys(rest).length) {
            const fresh = newId()
            return set(open(fresh, { [fresh]: blank(armyId) }))
          }
          if (id !== activeId) return set({ rosters: rest })
          const next = latestFor(rest, rosters[id].armyId) ?? Object.keys(rest)[0]
          set(open(next, rest))
        },
        importLists: (json) => {
          const data = JSON.parse(json) as { lists?: unknown[] } | unknown[]
          const raw = Array.isArray(data) ? data : data.lists
          if (!Array.isArray(raw)) throw new Error('Not a list export')
          const lists = raw.map(parseRoster).filter((r): r is Roster => !!r)
          if (!lists.length) throw new Error('No valid lists in that file')
          return get().addLists(lists)
        },
        addLists: (lists) => {
          if (!lists.length) return 0
          const added = { ...get().rosters }
          let last = ''
          for (const l of lists) {
            last = newId()
            added[last] = { ...l, updated: Date.now() }
          }
          set(open(last, added))
          return lists.length
        },
        update: (patch) => mut((r) => ({ ...r, ...patch })),
        addEntry: (e) => mut((r) => ({ ...r, entries: [...r.entries, { ...e, uid: newId() }] })),
        patchEntry: (uid, patch) => mut((r) => ({ ...r, entries: r.entries.map((x) => (x.uid === uid ? { ...x, ...patch } : x)) })),
        removeEntry: (uid) =>
          mut((r) => ({
            ...r,
            // anyone attached to the removed unit becomes unattached
            entries: r.entries.filter((x) => x.uid !== uid).map((x) => (x.leading === uid ? { ...x, leading: undefined } : x)),
          })),
        reset: () => mut((r) => blank(r.armyId)),
      }
    },
    {
      name: 'builder-v3',
      version: 5,
      // v4 replaced the old per-entry `wargear` ids with `loadout`; v5 went from one list per army to many lists by id.
      // Saved lists survive both.
      migrate: (state, from) => {
        const st = state as { armyId?: string; activeId?: string; rosters?: Record<string, Roster> }
        for (const r of Object.values(st.rosters ?? {})) for (const e of r.entries ?? []) delete (e as unknown as Record<string, unknown>).wargear
        if (from < 5) {
          const rosters: Record<string, Roster> = {}
          let active = ''
          for (const [armyId, r] of Object.entries(st.rosters ?? {})) {
            const id = newId()
            rosters[id] = { ...r, armyId: r.armyId ?? armyId, updated: Date.now() }
            if (armyId === st.armyId) active = id
          }
          if (!Object.keys(rosters).length) {
            active = newId()
            rosters[active] = blank(st.armyId ?? armyList[0].id)
          }
          st.rosters = rosters
          st.activeId = active || Object.keys(rosters)[0]
        }
        return st as unknown as BuilderState
      },
    },
  ),
)
