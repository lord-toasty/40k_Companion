import { sizeOf, type Army, type Detachment, type Enhancement, type UnitReq, type Roster, type RosterEntry, type Unit, type UnitSize } from '../schema/army'
import { DISPOSITIONS, type Disposition } from '../data/matrix'
import { loadoutPoints, loadoutSummary } from './loadout'

export const selectedDetachments = (army: Army, roster: Roster): Detachment[] =>
  army.detachments.filter((d) => roster.detachmentIds.includes(d.id))

/** Dispositions the selected detachments allow, in the usual order. */
export const dispositionOptions = (army: Army, roster: Roster): Disposition[] => {
  const have = new Set(selectedDetachments(army, roster).flatMap((d) => d.dispositions ?? []))
  return DISPOSITIONS.filter((d) => have.has(d))
}

export const detachmentPointsUsed = (army: Army, roster: Roster) =>
  selectedDetachments(army, roster).reduce((a, d) => a + (d.dp ?? 0), 0)

/** Which copy of its datasheet this entry is in the roster (1 = first). */
export const copyNumber = (roster: Roster, e: RosterEntry) =>
  roster.entries.filter((x) => x.unitId === e.unitId).findIndex((x) => x.uid === e.uid) + 1

/** Cost of a unit's size option for the nth copy; the last listed value covers every further copy. */
export const pointsFor = (points: number[], copy: number) => points[Math.min(Math.max(copy, 1), points.length) - 1] ?? 0

export function entryPoints(army: Army, e: RosterEntry, roster: Roster): number {
  const unit = army.units.find((u) => u.id === e.unitId)
  if (!unit) return 0
  const size = sizeOf(unit, e.sizeKey)
  const base = pointsFor(size.points, copyNumber(roster, e))
  const gear = loadoutPoints(unit, size.models, e.loadout)
  const enh = selectedDetachments(army, roster).flatMap((d) => d.enhancements).find((x) => x.id === e.enhancementId)?.points ?? 0
  return base + gear + enh
}

/** What the next copy of this size would cost with the default loadout (the left-hand catalogue price). */
export const defaultEntryPrice = (unit: Unit, size: UnitSize, copy: number) =>
  pointsFor(size.points, copy) + loadoutPoints(unit, size.models, undefined)

export function rosterPoints(army: Army, roster: Roster): number {
  return roster.entries.reduce((a, e) => a + entryPoints(army, e, roster), 0)
}

/** Detachment Point budget for a points limit: smaller games (1000 pts or fewer) get fewer. */
export const detachmentBudget = (army: Army, limit: number) =>
  limit <= 1000 ? Math.min(army.detachmentPointsIncursion ?? 2, army.detachmentPoints) : army.detachmentPoints

const reqBlock = (r: UnitReq, kw: string[]): string | null => {
  const has = (k: string) => kw.includes(k)
  if (r.allKeywords && !r.allKeywords.every(has)) return `${r.allKeywords.join(' + ')} units only`
  if (r.anyKeywords && !r.anyKeywords.some(has)) return `${r.anyKeywords.join(' or ')} units only`
  if (r.noKeywords && r.noKeywords.some(has)) return `Not ${r.noKeywords.join(' / ')} units`
  return null
}

/**
 * Why this unit can't carry the enhancement, or null if it can. Ordinary enhancements are for Characters only;
 * upgrades can go on any unit that matches their keyword requirements, Characters included.
 */
export function upgradeBlock(enh: Enhancement, unit: Unit): string | null {
  if (!enh.upgrade && unit.role !== 'Character') return 'Only Characters can take this enhancement'
  const kw = unit.datasheet?.keywords ?? []
  if (kw.includes('Epic Hero')) return "Epic Heroes can't take enhancements"
  return (enh.upgrade && reqBlock(enh.upgrade, kw)) || (enh.requires && reqBlock(enh.requires, kw)) || null
}

const isCharacter = (army: Army, e: RosterEntry) => army.units.find((u) => u.id === e.unitId)?.role === 'Character'

/**
 * How many units may carry this enhancement. Ordinary enhancements and any use on a Character are once per army;
 * an upgrade on non-Character units can go on `maxUnits` of them (1 for the "one per army" upgrades).
 * `holders` are the entries that carry it, `candidateIsCharacter` is the unit about to take it (if any).
 */
export function enhancementLimit(army: Army, enh: Enhancement, holders: RosterEntry[], candidateIsCharacter = false): number {
  if (!enh.upgrade) return 1
  if (candidateIsCharacter || holders.some((h) => isCharacter(army, h))) return 1
  return enh.upgrade.maxUnits
}

/** Entries carrying this enhancement, optionally ignoring one entry (the one being edited). */
export const enhancementHolders = (roster: Roster, id: string, exceptUid?: string) =>
  roster.entries.filter((e) => e.enhancementId === id && e.uid !== exceptUid)

export const maxEnhancements = (army: Army, limit: number) => {
  const m = army.maxEnhancements ?? { default: 4, incursion: 2 }
  return limit <= 1000 ? m.incursion : m.default
}

export function validate(army: Army, roster: Roster): string[] {
  const issues: string[] = []
  const total = rosterPoints(army, roster)
  if (total > roster.limit) issues.push(`Over limit by ${total - roster.limit} pts`)
  const dp = detachmentPointsUsed(army, roster)
  const budget = detachmentBudget(army, roster.limit)
  if (dp > budget) issues.push(`Detachment points ${dp}/${budget}`)

  const groups = new Map<string, number>()
  for (const d of selectedDetachments(army, roster)) if (d.unique) groups.set(d.unique.group, (groups.get(d.unique.group) ?? 0) + 1)
  for (const [g, n] of groups) if (n > 1) issues.push(`Only one ${g} detachment allowed`)

  for (const u of army.units) {
    const n = roster.entries.filter((e) => e.unitId === u.id).length
    if (u.maxPerList && n > u.maxPerList) issues.push(`${u.name}: max ${u.maxPerList} per list`)
  }

  // an upgrade carried by several units still uses one slot, so slots are counted per distinct enhancement
  const all = army.detachments.flatMap((d) => d.enhancements)
  const used = [...new Set(roster.entries.map((e) => e.enhancementId).filter((x): x is string => !!x))]
  const cap = maxEnhancements(army, roster.limit)
  if (used.length > cap) issues.push(`Enhancements ${used.length}/${cap}`)
  for (const id of used) {
    const enh = all.find((x) => x.id === id)
    if (!enh) continue
    const holders = enhancementHolders(roster, id)
    const max = enhancementLimit(army, enh, holders)
    if (holders.length <= max) continue
    issues.push(
      !enh.upgrade ? 'Duplicate enhancement'
        : max === 1 && holders.some((h) => isCharacter(army, h)) ? `${enh.name}: on a Character, so only 1 use allowed`
        : `${enh.name}: max ${max} unit${max === 1 ? '' : 's'}`,
    )
  }
  for (const e of roster.entries) {
    const u = army.units.find((x) => x.id === e.unitId)
    const enh = all.find((x) => x.id === e.enhancementId)
    if (!u || !enh) continue
    const why = upgradeBlock(enh, u)
    if (why) issues.push(`${u.name} can't take ${enh.name}: ${why}`)
  }
  return issues
}

export function exportText(army: Army, roster: Roster): string {
  const dets = selectedDetachments(army, roster)
  const enhancements = dets.flatMap((d) => d.enhancements)
  const lines = [
    `${roster.name} (${rosterPoints(army, roster)}/${roster.limit} pts)`,
    `${army.name}${dets.length ? ' - ' + dets.map((d) => d.name).join(', ') : ''}`,
    ...(roster.disposition ? [`Disposition: ${roster.disposition}`] : []),
    '',
  ]
  for (const e of roster.entries) {
    const u = army.units.find((x) => x.id === e.unitId)
    if (!u) continue
    const s = sizeOf(u, e.sizeKey)
    const gear = loadoutSummary(u, s.models, e.loadout)
    const enh = enhancements.find((x) => x.id === e.enhancementId)
    lines.push(`${u.name} (${s.models} models${s.label ? ', ' + s.label : ''}) [${entryPoints(army, e, roster)}]`)
    if (gear.length) lines.push(`  - ${gear.join(', ')}`)
    if (enh) lines.push(`  - Enhancement: ${enh.name}`)
  }
  if (roster.notes) lines.push('', roster.notes)
  return lines.join('\n')
}
