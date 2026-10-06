import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Roster, RosterEntry } from '../schema/army'
import { armyList } from '../armies'

export const blank = (armyId: string): Roster => ({ armyId, name: 'New List', limit: 2000, detachmentIds: [], entries: [], notes: '' })

interface BuilderState {
  armyId: string
  rosters: Record<string, Roster> // one working list per army
  setArmy: (id: string) => void
  update: (patch: Partial<Roster>) => void
  addEntry: (e: Omit<RosterEntry, 'uid'>) => void
  patchEntry: (uid: string, patch: Partial<RosterEntry>) => void
  removeEntry: (uid: string) => void
  reset: () => void
}

export const useBuilder = create<BuilderState>()(
  persist(
    (set) => {
      const mut = (fn: (r: Roster) => Roster) =>
        set((s) => ({ rosters: { ...s.rosters, [s.armyId]: fn(s.rosters[s.armyId] ?? blank(s.armyId)) } }))
      return {
        armyId: armyList[0].id,
        rosters: {},
        setArmy: (armyId) => set({ armyId }),
        update: (patch) => mut((r) => ({ ...r, ...patch })),
        addEntry: (e) => mut((r) => ({ ...r, entries: [...r.entries, { ...e, uid: crypto.randomUUID() }] })),
        patchEntry: (uid, patch) => mut((r) => ({ ...r, entries: r.entries.map((x) => (x.uid === uid ? { ...x, ...patch } : x)) })),
        removeEntry: (uid) =>
          mut((r) => ({
            ...r,
            // anyone attached to the removed unit becomes unattached
            entries: r.entries.filter((x) => x.uid !== uid).map((x) => (x.leading === uid ? { ...x, leading: undefined } : x)),
          })),
        reset: () => set((s) => ({ rosters: { ...s.rosters, [s.armyId]: blank(s.armyId) } })),
      }
    },
    {
      name: 'builder-v3',
      version: 4,
      // v4 replaced the old per-entry `wargear` ids with `loadout`; keep saved lists and drop the old field
      migrate: (state) => {
        const st = state as { rosters?: Record<string, { entries?: Record<string, unknown>[] }> }
        for (const r of Object.values(st.rosters ?? {})) for (const e of r.entries ?? []) delete e.wargear
        return st as unknown as BuilderState
      },
    },
  ),
)
