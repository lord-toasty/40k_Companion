import { sizeOf, type Army, type Detachment, type Roster, type RosterEntry, type Unit, type UnitSize } from '../schema/army'
import { loadoutPoints, loadoutSummary } from './loadout'

export const selectedDetachments = (army: Army, roster: Roster): Detachment[] =>
  army.detachments.filter((d) => roster.detachmentIds.includes(d.id))

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

  const enh = roster.entries.map((e) => e.enhancementId).filter(Boolean)
  if (new Set(enh).size !== enh.length) issues.push('Duplicate enhancement')
  const cap = maxEnhancements(army, roster.limit)
  if (enh.length > cap) issues.push(`Enhancements ${enh.length}/${cap}`)
  for (const e of roster.entries) {
    const u = army.units.find((x) => x.id === e.unitId)
    if (e.enhancementId && u && u.role !== 'Character') issues.push(`${u.name} is not a Character and cannot take an enhancement`)
  }
  return issues
}

export function exportText(army: Army, roster: Roster): string {
  const dets = selectedDetachments(army, roster)
  const enhancements = dets.flatMap((d) => d.enhancements)
  const lines = [
    `${roster.name} (${rosterPoints(army, roster)}/${roster.limit} pts)`,
    `${army.name}${dets.length ? ' - ' + dets.map((d) => d.name).join(', ') : ''}`,
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
