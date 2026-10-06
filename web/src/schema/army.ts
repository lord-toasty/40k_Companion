/** A weapon-row or ability name on the unit's datasheet, and how many each model carries (default 1). */
export interface GearRef { name: string; perModel?: number }
/** What a model carries under one option. `points` is per model carrying it. */
export interface GearChoice { id: string; label: string; gear: GearRef[]; points?: number }
/**
 * One wargear decision. The first choice is the default. Each model picks one choice; for units of several
 * models the non-default counts are capped by the model count and by `limit` (e.g. 1 Vexilla per unit).
 */
export interface GearSlot { id: string; label: string; choices: GearChoice[]; limit?: Record<string, number> }
/** Non-default counts only: slot id -> choice id -> number of models. Missing means the default loadout. */
export type Loadout = Record<string, Record<string, number>>

/**
 * A way to take a unit. `points` is the cost by copy of the same datasheet in the list:
 * [1st, 2nd, 3rd, ...]; the last value applies to every further copy.
 */
export interface UnitSize { key: string; label?: string; models: number; points: number[] }

export interface Weapon {
  name: string
  range: string
  attacks: string
  skill: string // BS or WS
  strength: string
  ap: string
  damage: string
  keywords: string[]
}
export interface Ability { name: string; text: string }
export interface Datasheet {
  stats: { M: string; T: string; Sv: string; W: string; LD: string; OC: string; InSv: string; Base?: string }
  ranged: Weapon[]
  melee: Weapon[]
  weaponNotes?: string[]
  core?: string[]
  armyRules?: string[]
  abilities: Ability[]
  wargearOptions?: string[] // free text, no points attached
  composition?: string
  keywords: string[]
  factionKeywords?: string[]
}

export const ROLES = ['Character', 'Battleline', 'Infantry', 'Mounted', 'Vehicle'] as const
export type Role = (typeof ROLES)[number]
export const ROLE_LABELS: Record<Role, string> = {
  Character: 'Characters',
  Battleline: 'Battleline',
  Infantry: 'Infantry',
  Mounted: 'Mounted',
  Vehicle: 'Vehicles',
}

export interface Unit {
  id: string
  name: string
  role: Role
  sizes: UnitSize[]
  slots?: GearSlot[]
  leadsText?: string // the Leader rule as shown on the datasheet: which units it can be attached to
  leads?: UnitReq // which non-Character units this Character can be attached to (default: any Infantry unit)
  maxPerList?: number
  datasheet?: Partial<Datasheet>
}

/**
 * An Upgrade is an enhancement that non-Character units can take instead of a Character. It still takes one
 * enhancement slot however many units carry it (each unit pays the points), up to `maxUnits` units.
 * A unit must have all of `allKeywords`, at least one of `anyKeywords`, and none of `noKeywords`.
 */
export interface UnitReq { allKeywords?: string[]; anyKeywords?: string[]; noKeywords?: string[] }
export interface UpgradeRule extends UnitReq { maxUnits: number }
export interface Enhancement {
  id: string
  name: string
  points: number
  text?: string
  upgrade?: UpgradeRule
  grants?: { ranged?: Weapon; ability?: Ability } // appears on the bearer's datasheet
  requires?: UnitReq // which units can carry it (ordinary enhancements; an upgrade keeps its own in `upgrade`)
  aka?: string // other name for it in a second source (leaks disagree on a couple of names)
}
export interface Stratagem { id: string; name: string; cp: number; turn: string; when: string; target: string; effect: string }
export interface NamedRule { name: string; text: string }
import type { Disposition } from '../data/matrix'

export interface Detachment {
  id: string
  name: string
  dispositions?: Disposition[] // which dispositions this detachment supports (a list picks one of the union)
  dp?: number // Detachment Point cost; undefined while unknown
  rule?: NamedRule
  favouredKatah?: NamedRule | null
  unique?: { group: string; text: string } | null // e.g. only one "Shield Host" detachment per army
  extraRules?: NamedRule[]
  enhancements: Enhancement[]
  stratagems?: Stratagem[]
  phaseOptions?: { phase: string; options: string[] }[]
}
export interface Army {
  id: string
  name: string
  detachmentPoints: number // DP budget, e.g. 3
  detachmentPointsIncursion?: number // DP budget at Incursion (1000 pts or fewer); 2 if unset
  maxEnhancements?: { default: number; incursion: number } // incursion = 1000 pts or fewer
  armyRule?: NamedRule
  armyRuleKeywords?: string[] // keyword definitions to show under the army rule (terms from keywordDefinitions)
  katahs?: (NamedRule & { timing: string })[]
  keywordDefinitions?: { term: string; text: string }[]
  units: Unit[]
  detachments: Detachment[]
}

export interface RosterEntry {
  uid: string
  unitId: string
  sizeKey: string
  loadout?: Loadout
  enhancementId?: string
  leading?: string // uid of the roster unit this Character is attached to (needs the Leader ability)
}
export interface Roster {
  armyId: string
  name: string
  limit: number
  detachmentIds: string[]
  disposition?: Disposition // chosen from the dispositions of the selected detachments
  entries: RosterEntry[]
  notes: string
}

export const sizeOf = (unit: Unit, key: string): UnitSize => unit.sizes.find((s) => s.key === key) ?? unit.sizes[0]
export const sizeName = (s: UnitSize) => `${s.models}${s.label ? ' ' + s.label : ''}`

const zeroWeapon = (name: string, skill: string): Weapon => ({ name, range: '0"', attacks: '0', skill, strength: '0', ap: '0', damage: '0', keywords: [] })

/** Fill any missing datasheet fields with zero placeholders. */
export function datasheetFor(unit: Unit): Datasheet {
  const d = unit.datasheet ?? {}
  return {
    stats: { M: '0"', T: '0', Sv: '0+', W: '0', LD: '0+', OC: '0', InSv: '0+', ...d.stats },
    ranged: d.ranged ?? [zeroWeapon('Ranged weapon', 'BS')],
    melee: d.melee ?? [zeroWeapon('Melee weapon', 'WS')],
    weaponNotes: d.weaponNotes ?? [],
    core: d.core ?? [],
    armyRules: d.armyRules ?? [],
    abilities: d.abilities ?? [{ name: 'Ability', text: '' }],
    wargearOptions: d.wargearOptions ?? [],
    composition: d.composition,
    keywords: d.keywords ?? [unit.role, unit.name],
    factionKeywords: d.factionKeywords ?? [],
  }
}
