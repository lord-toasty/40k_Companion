export const DISPOSITIONS = ['Purge the Foe', 'Take and Hold', 'Priority Assets', 'Reconnaissance', 'Disruption'] as const
export type Disposition = (typeof DISPOSITIONS)[number]

// Rows of the source matrix, top to bottom: the opponent's disposition.
const OPPONENT_ORDER: Disposition[] = ['Take and Hold', 'Purge the Foe', 'Disruption', 'Reconnaissance', 'Priority Assets']

// Each column is a player's own disposition; entries follow OPPONENT_ORDER.
const COLUMNS: Record<Disposition, string[]> = {
  'Purge the Foe': ['Unstoppable Force', 'Meatgrinder', 'Punishment', 'Consecrate', "Destroyer's Wrath"],
  'Take and Hold': ['Battlefield Dominance', 'Immovable Object', 'Determined Acquisition', 'Purge and Secure', 'Inescapable Dominion'],
  'Priority Assets': ['Secure Asset', 'Vital Link', 'Extract Relic', 'Vanguard Operation', 'Sabotage'],
  Reconnaissance: ['Reconnaissance Sweep', 'Triangulation', 'Surveil the Foe', 'Gather Intel', 'Search and Scour'],
  // Order follows the printed cards' OPPONENT lines (the sheet text listed this column differently).
  Disruption: ['Death Trap', 'Delaying Action', 'Outmanoeuvre', 'Smoke and Mirrors', 'Locate and Deny'],
}

/** MATRIX[mine][opponent] = the primary mission *I* play against that opponent. */
export const MATRIX = Object.fromEntries(
  DISPOSITIONS.map((mine) => [mine, Object.fromEntries(OPPONENT_ORDER.map((opp, i) => [opp, COLUMNS[mine][i]]))]),
) as Record<Disposition, Record<Disposition, string>>

export const slug = (name: string) =>
  name.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Each player gets their own primary: their column, the opponent's disposition as the row. */
export const primaryFor = (mine: Disposition, opponent: Disposition) => MATRIX[mine][opponent]
export const primaryId = (name: string) => `primary-${slug(name)}`
