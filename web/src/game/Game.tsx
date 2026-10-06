import { useEffect, useState } from 'react'
import CardPicker from '../components/CardPicker'
import Counter from '../components/Counter'
import { byId, CAPS, totalVp, useGame, vpRoom, type Side } from '../store/game'
import { DISPOSITIONS, type Disposition } from '../data/matrix'
import LayoutPicker from './LayoutPicker'
import SecondariesModal, { type Tab } from './SecondariesModal'

const sides: Side[] = ['attacker', 'defender']
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export default function Game() {
  const g = useGame()
  const [viewing, setViewing] = useState<{ side: Side; tab: Tab; uid?: string }>()

  // The popout gets its own history entry so the browser Back button closes it
  // instead of leaving the game tracker.
  const openSec = (side: Side, tab: Tab = 'hand', uid?: string) => {
    history.pushState({ secModal: true }, '')
    setViewing({ side, tab, uid })
  }
  const closeSec = () => (history.state?.secModal ? history.back() : setViewing(undefined))
  useEffect(() => {
    const onPop = () => setViewing(undefined)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div>
      <section className="bar">
        <button onClick={g.undo} disabled={!g.history.length}>Undo</button>
        <button onClick={() => confirm('Start a new game?') && g.newGame()}>New game</button>
      </section>

      <section>
        <LayoutPicker />
      </section>

      <section className="round-bar">
        <Counter label="Round" value={g.round} onChange={(d) => g.setRound(g.round + d)} />
      </section>

      <section className="players">
        {sides.map((side) => {
          const p = g.players[side]
          return (
            <div key={side} className="player">
              <h3>
                <select value={p.disposition ?? ''} onChange={(e) => g.setDisposition(side, (e.target.value || undefined) as Disposition | undefined)} aria-label={`${side} disposition`}>
                  <option value="">Disposition...</option>
                  {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="side-label"> {side === 'attacker' ? 'Attacker' : 'Defender'}</span>
              </h3>
              <div className="score">{totalVp(p)} VP</div>
              <Counter label="CP" value={p.cp} onChange={(d) => g.adjustCp(side, d)} />
              <Counter
                label={`Primary R${g.round}`}
                value={p.primaryVp[g.round - 1]}
                onChange={(d) => g.adjustVp(side, 'primaryVp', d)}
                atMax={vpRoom(p, 'primaryVp', g.round) === 0}
                note={`${sum(p.primaryVp)}/${CAPS.primaryGame} game`}
              />
              <Counter
                label={`Secondary R${g.round}`}
                value={p.secondaryVp[g.round - 1]}
                onChange={(d) => g.adjustVp(side, 'secondaryVp', d)}
                atMax={vpRoom(p, 'secondaryVp', g.round) === 0}
                note={`${p.secondaryVp[g.round - 1]}/${CAPS.secondaryRound} round · ${sum(p.secondaryVp)}/${CAPS.secondaryGame} game`}
              />
              <table>
                <thead><tr><th>Rd</th>{[1, 2, 3, 4, 5].map((r) => <th key={r}>{r}</th>)}</tr></thead>
                <tbody>
                  <tr><td>Pri</td>{p.primaryVp.map((v, i) => <td key={i}>{v}</td>)}</tr>
                  <tr><td>Sec</td>{p.secondaryVp.map((v, i) => <td key={i}>{v}</td>)}</tr>
                </tbody>
              </table>
              <CardPicker title="Primary mission" type="primary" value={p.primary} onPick={(id) => g.setPrimary(side, id)} />
              <div className="row">
                <button onClick={() => openSec(side)}>Secondaries ({p.hand.length})</button>
                <button onClick={() => g.drawSecondaries(side, 2)}>Draw 2</button>
              </div>
              <div className="hand-box">
                {p.hand.length === 0 ? <p className="muted small">No secondaries in hand.</p> : (
                  <table className="hand-table">
                    <tbody>
                      {p.hand.map((h) => (
                        <tr key={h.uid} onClick={() => openSec(side, 'hand', h.uid)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openSec(side, 'hand', h.uid)}>
                          <td>{byId(h.id)?.name ?? h.id}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="row">
                <button onClick={() => openSec(side, 'achieved')}>Achieved ({p.achieved.length})</button>
                <button onClick={() => openSec(side, 'discarded')}>Discarded ({p.discarded.length})</button>
              </div>
            </div>
          )
        })}
      </section>

      {viewing && <SecondariesModal side={viewing.side} initialTab={viewing.tab} initialSelected={viewing.uid} onClose={closeSec} />}
    </div>
  )
}
