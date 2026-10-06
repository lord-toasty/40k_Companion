import { datasheetFor, type Ability, type Datasheet, type Enhancement, type GearChoice, type GearSlot, type Loadout, type Unit, type Weapon } from '../schema/army'

/**
 * Wargear loadouts. A unit's slots say what each model may carry; a loadout stores only the NON-default
 * counts, so a missing entry is the default loadout and the default count is always derived
 * (models - everything else). Every read goes through normalizeLoadout, so an illegal loadout can't exist.
 */

export type ResolvedWeapon = Weapon & { count: number }
export type ResolvedSheet = Omit<Datasheet, 'ranged' | 'melee'> & { ranged: ResolvedWeapon[]; melee: ResolvedWeapon[] }

const defaultChoice = (slot: GearSlot) => slot.choices[0]
const cap = (slot: GearSlot, choiceId: string, models: number) => Math.min(models, slot.limit?.[choiceId] ?? models)

/** Drop unknown ids, clamp every count to the model count and its limit, and keep the slot total within the models. */
export function normalizeLoadout(unit: Unit, models: number, loadout?: Loadout): Loadout {
  const out: Loadout = {}
  for (const slot of unit.slots ?? []) {
    const stored = loadout?.[slot.id] ?? {}
    let room = models
    const counts: Record<string, number> = {}
    for (const choice of slot.choices.slice(1)) {
      const n = Math.max(0, Math.min(Math.floor(stored[choice.id] ?? 0), cap(slot, choice.id, models), room))
      if (n > 0) { counts[choice.id] = n; room -= n }
    }
    if (Object.keys(counts).length) out[slot.id] = counts
  }
  return out
}

/** Full counts for a slot, including the derived default choice. */
export function slotCounts(slot: GearSlot, models: number, loadout?: Loadout): Record<string, number> {
  const stored = loadout?.[slot.id] ?? {}
  const counts: Record<string, number> = {}
  let used = 0
  for (const choice of slot.choices.slice(1)) { counts[choice.id] = stored[choice.id] ?? 0; used += counts[choice.id] }
  counts[defaultChoice(slot).id] = models - used
  return counts
}

/** How many more models could still take this choice. */
export function headroom(unit: Unit, slot: GearSlot, choiceId: string, models: number, loadout?: Loadout): number {
  const l = normalizeLoadout(unit, models, loadout)
  const stored = l[slot.id] ?? {}
  const others = Object.entries(stored).reduce((a, [id, n]) => a + (id === choiceId ? 0 : n), 0)
  return Math.max(0, Math.min(models - others, cap(slot, choiceId, models)) - (stored[choiceId] ?? 0))
}

export function setChoiceCount(unit: Unit, models: number, loadout: Loadout | undefined, slotId: string, choiceId: string, count: number): Loadout {
  const slot = unit.slots?.find((s) => s.id === slotId)
  if (!slot || choiceId === defaultChoice(slot).id) return normalizeLoadout(unit, models, loadout)
  const next: Loadout = { ...normalizeLoadout(unit, models, loadout), [slotId]: { ...(loadout?.[slotId] ?? {}), [choiceId]: count } }
  return normalizeLoadout(unit, models, next)
}

/** Radio-style pick for a single model: exactly this choice carries it. */
export function selectChoice(unit: Unit, models: number, loadout: Loadout | undefined, slotId: string, choiceId: string): Loadout {
  const slot = unit.slots?.find((s) => s.id === slotId)
  if (!slot) return normalizeLoadout(unit, models, loadout)
  const rest = { ...normalizeLoadout(unit, models, loadout) }
  delete rest[slotId]
  return choiceId === defaultChoice(slot).id ? rest : normalizeLoadout(unit, models, { ...rest, [slotId]: { [choiceId]: models } })
}

export const loadoutPoints = (unit: Unit, models: number, loadout?: Loadout): number => {
  const l = normalizeLoadout(unit, models, loadout)
  return (unit.slots ?? []).reduce((total, slot) => {
    const counts = slotCounts(slot, models, l)
    return total + slot.choices.reduce((a, c) => a + (c.points ?? 0) * (counts[c.id] ?? 0), 0)
  }, 0)
}

/**
 * What the unit carries, default choices included, e.g. ["2 Guardian Spear", "1 Castellan Axe", "Vexilla"].
 * Choices that carry nothing (the "no vexilla" default) are left out, and multi-model units show counts.
 */
export function loadoutSummary(unit: Unit, models: number, loadout?: Loadout): string[] {
  const l = normalizeLoadout(unit, models, loadout)
  const out: string[] = []
  for (const slot of unit.slots ?? []) {
    const counts = slotCounts(slot, models, l)
    for (const c of slot.choices) {
      const n = counts[c.id] ?? 0
      if (n > 0 && c.gear.length) out.push(models > 1 ? `${n} ${c.label}` : c.label)
    }
  }
  return out
}

const gatedNames = (unit: Unit) => new Set((unit.slots ?? []).flatMap((s) => s.choices.flatMap((c) => c.gear.map((g) => g.name))))

/** How many of each named item the loadout carries (gated items only). */
function carried(unit: Unit, models: number, loadout?: Loadout): Map<string, number> {
  const l = normalizeLoadout(unit, models, loadout)
  const total = new Map<string, number>()
  for (const slot of unit.slots ?? []) {
    const counts = slotCounts(slot, models, l)
    for (const c of slot.choices) for (const g of c.gear) total.set(g.name, (total.get(g.name) ?? 0) + (counts[c.id] ?? 0) * (g.perModel ?? 1))
  }
  return total
}

/** The datasheet as it stands for this loadout: gated weapons/abilities only when carried, with real counts. */
export function resolveSheet(unit: Unit, models: number, loadout?: Loadout): ResolvedSheet {
  const ds = datasheetFor(unit)
  const gated = gatedNames(unit)
  const have = carried(unit, models, loadout)
  const weapons = (list: Weapon[]): ResolvedWeapon[] =>
    list
      .map((w) => ({ ...w, count: gated.has(w.name) ? have.get(w.name) ?? 0 : models }))
      .filter((w) => w.count > 0)
  const abilities: Ability[] = ds.abilities.filter((a) => !gated.has(a.name) || (have.get(a.name) ?? 0) > 0)
  return { ...ds, ranged: weapons(ds.ranged), melee: weapons(ds.melee), abilities }
}

/** A sheet with the weapon and ability an enhancement gives its bearer added (one copy: only the bearer has it). */
export function withEnhancement(sheet: ResolvedSheet, enh?: Enhancement): ResolvedSheet {
  const g = enh?.grants
  if (!g) return sheet
  return {
    ...sheet,
    ranged: g.ranged ? [...sheet.ranged, { ...g.ranged, count: 1 }] : sheet.ranged,
    abilities: g.ability ? [...sheet.abilities, g.ability] : sheet.abilities,
  }
}

/** Just the rows and ability text for one option, for its own popout. */
export function gearSheet(unit: Unit, choice: GearChoice) {
  const ds = datasheetFor(unit)
  const names = new Set(choice.gear.map((g) => g.name))
  return {
    ranged: ds.ranged.filter((w) => names.has(w.name)),
    melee: ds.melee.filter((w) => names.has(w.name)),
    abilities: ds.abilities.filter((a) => names.has(a.name)),
  }
}

/** Every legal loadout of a unit at a given model count (the spaces are tiny). */
export function enumerateLoadouts(unit: Unit, models: number): Loadout[] {
  let all: Loadout[] = [{}]
  for (const slot of unit.slots ?? []) {
    const extras = slot.choices.slice(1)
    const vectors: Record<string, number>[] = []
    const walk = (i: number, left: number, cur: Record<string, number>) => {
      if (i === extras.length) { vectors.push({ ...cur }); return }
      const max = Math.min(left, cap(slot, extras[i].id, models))
      for (let n = 0; n <= max; n++) walk(i + 1, left - n, n ? { ...cur, [extras[i].id]: n } : cur)
    }
    walk(0, models, {})
    all = all.flatMap((l) => vectors.map((v) => (Object.keys(v).length ? { ...l, [slot.id]: v } : l)))
  }
  return all
}
