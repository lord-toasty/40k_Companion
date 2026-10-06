import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import missions from '../data/missions.json'
import { primaryFor, primaryId, type Disposition } from '../data/matrix'

export type MissionType = 'primary' | 'secondary' | 'mission_rule' | 'deployment'
export interface ScoreEntry { text: string; vp: number | null }
export interface CardSection {
  heading: string
  tag: string | null // e.g. "TACTICAL", "OBJECTIVE ACTION"
  when: string | null
  entries: ScoreEntry[]
}
export interface CardBody {
  kind?: string | null // secondaries: "Tactical" / "Fixed / Tactical"
  whenDrawn?: string | null
  intro?: string | null
  sections: CardSection[]
  notes?: string | null
}
export interface Mission {
  id: string
  type: MissionType
  name: string
  group?: string // primaries: the disposition column the mission belongs to
  opponent?: string | null // primaries: the opponent disposition it is played against
  mirror?: boolean
  body?: CardBody
  sides?: Record<'attacker' | 'defender', CardBody> // secondaries differ by side
}
export const allMissions = missions as Mission[]
export const bodyFor = (m: Mission, side?: 'attacker' | 'defender'): CardBody =>
  (side && m.sides?.[side]) || m.body || { sections: [] }
export const byType = (t: MissionType) => allMissions.filter((m) => m.type === t)
export const byId = (id?: string) => allMissions.find((m) => m.id === id)

export type Side = 'attacker' | 'defender'
export type VpKind = 'primaryVp' | 'secondaryVp'

export interface HeldSecondary {
  uid: string
  id: string // mission id
  vp: number // VP scored with this card so far
}
/** A secondary that has left the hand: scored (Achieved) or discarded, and the round it happened in (0 = unknown). */
export interface PileCard { uid: string; id: string; round: number; vp: number }
export type Pile = 'achieved' | 'discarded'
export interface PlayerState {
  disposition?: Disposition
  primary?: string // this player's own primary mission id
  cp: number
  primaryVp: number[] // index 0 = round 1
  secondaryVp: number[]
  hand: HeldSecondary[] // secondaries currently held (any number)
  achieved: PileCard[] // scored secondaries, with the round they were scored in
  discarded: PileCard[] // discarded secondaries; neither pile can be drawn again unless returned to hand
}
const player = (): PlayerState => ({
  cp: 0,
  primaryVp: [0, 0, 0, 0, 0],
  secondaryVp: [0, 0, 0, 0, 0],
  hand: [],
  achieved: [],
  discarded: [],
})

interface GameState {
  round: number
  layoutVariant: number // 0-2: which of the matchup's three terrain layouts is shown
  players: Record<Side, PlayerState>
  history: string[] // JSON snapshots for undo
  setLayoutVariant: (v: number) => void
  drawSecondaries: (side: Side, count: number) => void
  addSecondary: (side: Side, id: string) => void
  scoreSecondary: (side: Side, uid: string, vp: number) => void // moves the card to Achieved
  returnToHand: (side: Side, pile: Pile, uid: string) => void
  discardSecondary: (side: Side, uid: string) => void // no CP change; track CP manually
  setDisposition: (side: Side, d?: Disposition) => void // sets both players' primaries once both are chosen
  setPrimary: (side: Side, id?: string) => void // manual override
  adjustCp: (side: Side, d: number) => void
  adjustVp: (side: Side, kind: VpKind, d: number) => void
  setRound: (r: number) => void
  undo: () => void
  newGame: () => void
}

/** Scoring caps: secondary VP per round and per game, primary VP per game. */
export const CAPS = { secondaryRound: 15, secondaryGame: 45, primaryGame: 50 }
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)
/** How many more VP of this kind the player may score this round before hitting a cap. */
export const vpRoom = (p: PlayerState, kind: VpKind, round: number) =>
  kind === 'primaryVp'
    ? Math.max(0, CAPS.primaryGame - sum(p.primaryVp))
    : Math.max(0, Math.min(CAPS.secondaryRound - p.secondaryVp[round - 1], CAPS.secondaryGame - sum(p.secondaryVp)))
/** Why `vp` more can't be scored, or null if it fits. */
export const vpWarning = (p: PlayerState, kind: VpKind, round: number, vp: number): string | null => {
  if (vp <= vpRoom(p, kind, round)) return null
  if (kind === 'primaryVp') return `Primary is capped at ${CAPS.primaryGame} VP per game (${sum(p.primaryVp)} scored).`
  const roundLeft = CAPS.secondaryRound - p.secondaryVp[round - 1]
  const gameLeft = CAPS.secondaryGame - sum(p.secondaryVp)
  return roundLeft <= gameLeft
    ? `Secondaries are capped at ${CAPS.secondaryRound} VP per round (${p.secondaryVp[round - 1]} scored this round, ${roundLeft} left).`
    : `Secondaries are capped at ${CAPS.secondaryGame} VP per game (${sum(p.secondaryVp)} scored, ${gameLeft} left).`
}

const pick = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)]
const snapshot = (s: GameState) => JSON.stringify({ round: s.round, layoutVariant: s.layoutVariant, players: s.players })
const held = (id: string): HeldSecondary => ({ uid: crypto.randomUUID(), id, vp: 0 })
const GAME_KEY = 'game-v5'

/** Secondaries a player can still draw: not in their hand, not discarded by them. */
export const drawable = (p: PlayerState) =>
  byType('secondary').filter((m) => ![...p.hand, ...p.achieved, ...p.discarded].some((c) => c.id === m.id))

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      // record an undo snapshot, then apply the change
      const act = (fn: (s: GameState) => Partial<GameState>) =>
        set((s) => ({ history: [...s.history.slice(-49), snapshot(s)], ...fn(s) }))
      const setP = (s: GameState, side: Side, p: Partial<PlayerState>) => ({
        players: { ...s.players, [side]: { ...s.players[side], ...p } },
      })
      return {
        round: 1,
        layoutVariant: 0,
        players: { attacker: player(), defender: player() },
        history: [],
        setLayoutVariant: (v) => act(() => ({ layoutVariant: Math.min(2, Math.max(0, v)) })),
        drawSecondaries: (side, count) =>
          act((s) => {
            const p = s.players[side]
            let pool = drawable(p)
            const drawn: HeldSecondary[] = []
            for (let i = 0; i < count && pool.length; i++) {
              const m = pick(pool)!
              drawn.push(held(m.id))
              pool = pool.filter((x) => x.id !== m.id)
            }
            return setP(s, side, { hand: [...p.hand, ...drawn] })
          }),
        addSecondary: (side, id) => act((s) => setP(s, side, { hand: [...s.players[side].hand, held(id)] })),
        scoreSecondary: (side, uid, vp) =>
          act((s) => {
            const p = s.players[side]
            if (vpWarning(p, 'secondaryVp', s.round, vp)) return {} // over a cap: the UI shows why
            const arr = [...p.secondaryVp]
            arr[s.round - 1] += vp
            const card = p.hand.find((h) => h.uid === uid)
            if (!card) return {}
            return setP(s, side, {
              secondaryVp: arr,
              hand: p.hand.filter((h) => h.uid !== uid),
              achieved: [...p.achieved, { uid: card.uid, id: card.id, round: s.round, vp: card.vp + vp }],
            })
          }),
        returnToHand: (side, pile, uid) =>
          act((s) => {
            const p = s.players[side]
            const card = p[pile].find((c) => c.uid === uid)
            if (!card) return {}
            // VP already scored stays in the round totals; fix it with the VP counter if the score was a mistake
            return setP(s, side, { [pile]: p[pile].filter((c) => c.uid !== uid), hand: [...p.hand, { uid: card.uid, id: card.id, vp: card.vp }] })
          }),
        discardSecondary: (side, uid) =>
          act((s) => {
            const p = s.players[side]
            const card = p.hand.find((h) => h.uid === uid)
            if (!card) return {}
            return setP(s, side, { hand: p.hand.filter((h) => h.uid !== uid), discarded: [...p.discarded, { uid: card.uid, id: card.id, round: s.round, vp: card.vp }] })
          }),
        setDisposition: (side, disposition) =>
          act((s) => {
            const otherSide: Side = side === 'attacker' ? 'defender' : 'attacker'
            const other = s.players[otherSide].disposition
            const next = setP(s, side, { disposition })
            if (!disposition || !other) return next
            // each player plays the mission in their own column against the opponent's disposition
            return {
              players: {
                ...next.players,
                [side]: { ...next.players[side], primary: primaryId(primaryFor(disposition, other)) },
                [otherSide]: { ...next.players[otherSide], primary: primaryId(primaryFor(other, disposition)) },
              },
            }
          }),
        setPrimary: (side, id) => act((s) => setP(s, side, { primary: id })),
        adjustCp: (side, d) => act((s) => setP(s, side, { cp: Math.max(0, s.players[side].cp + d) })),
        adjustVp: (side, kind, d) =>
          act((s) => {
            const p = s.players[side]
            const arr = [...p[kind]]
            arr[s.round - 1] = Math.max(0, arr[s.round - 1] + Math.min(d, vpRoom(p, kind, s.round)))
            return setP(s, side, { [kind]: arr })
          }),
        setRound: (round) => act(() => ({ round: Math.min(5, Math.max(1, round)) })),
        undo: () => {
          const h = get().history
          if (!h.length) return
          set({ ...JSON.parse(h[h.length - 1]), history: h.slice(0, -1) })
        },
        newGame: () =>
          set({
            round: 1,
            layoutVariant: 0,
            players: { attacker: player(), defender: player() },
            history: [],
          }),
      }
    },
    {
      name: GAME_KEY,
      version: 2,
      // v1 kept scored cards in hand and stored discards as bare ids
      migrate: (persisted: unknown) => {
        const st = persisted as { players?: Record<Side, Record<string, unknown>>; history?: string[] }
        for (const side of ['attacker', 'defender'] as Side[]) {
          const p = st.players?.[side]
          if (!p) continue
          p.achieved = Array.isArray(p.achieved) ? p.achieved : []
          p.discarded = ((p.discarded as unknown[]) ?? []).map((d) =>
            typeof d === 'string' ? { uid: crypto.randomUUID(), id: d, round: 0, vp: 0 } : d,
          )
        }
        st.history = [] // old undo snapshots have the old shape
        return st as never
      },
    },
  ),
)
export const totalVp = (p: PlayerState) => [...p.primaryVp, ...p.secondaryVp].reduce((a, b) => a + b, 0)
