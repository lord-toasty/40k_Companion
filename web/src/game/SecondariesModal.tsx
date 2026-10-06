import { useEffect, useState } from 'react'
import CardBody from '../components/CardBody'
import { byId, CAPS, drawable, useGame, vpRoom, vpWarning, type Side } from '../store/game'

export type Tab = 'hand' | 'achieved' | 'discarded'
const roundText = (r: number) => (r ? `Round ${r}` : 'Round ?')

export default function SecondariesModal({ side, initialTab = 'hand', initialSelected, onClose }: {
  side: Side
  initialTab?: Tab
  initialSelected?: string
  onClose: () => void
}) {
  const g = useGame()
  const p = g.players[side]
  const [tab, setTab] = useState<Tab>(initialTab)
  const [selected, setSelected] = useState<string | undefined>(initialSelected)
  const [vp, setVp] = useState(1)
  const [toAdd, setToAdd] = useState('')
  const pool = drawable(p)
  const cards = p[tab]
  const sel = cards.find((c) => c.uid === selected)
  const label = side === 'attacker' ? 'Attacker' : 'Defender'
  const room = vpRoom(p, 'secondaryVp', g.round)
  const warning = vpWarning(p, 'secondaryVp', g.round, vp)
  const gameTotal = p.secondaryVp.reduce((a, b) => a + b, 0)
  const pick = (t: Tab) => { setTab(t); setSelected(undefined) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tabs: [Tab, string, number][] = [['hand', 'Hand', p.hand.length], ['achieved', 'Achieved', p.achieved.length], ['discarded', 'Discarded', p.discarded.length]]

  return (
    <div className="modal-backdrop" onClick={onClose}>
    <div className="sec-panel" role="dialog" aria-label={`${label} secondaries`} onClick={(e) => e.stopPropagation()}>
      <header className="sec-top">
        <h2>{label} secondaries <small>({gameTotal}/{CAPS.secondaryGame} VP scored)</small></h2>
        <button onClick={onClose} aria-label="Close">✕</button>
      </header>

      <div className="tabs sec-tabs">
        {tabs.map(([t, name, n]) => (
          <button key={t} className={t === tab ? 'on' : ''} onClick={() => pick(t)}>{name} ({n})</button>
        ))}
      </div>

      <div className="sec-grid">
        {cards.length === 0 && <p className="muted">{tab === 'hand' ? 'No secondaries held. Draw some below.' : `Nothing ${tab} yet.`}</p>}
        {cards.map((c) => {
          const m = byId(c.id)
          const done = 'round' in c ? c : undefined
          return (
            <button key={c.uid} className={`sec-card ${c.uid === selected ? 'on' : ''}`} onClick={() => setSelected(c.uid === selected ? undefined : c.uid)}>
              {m ? <CardBody mission={m} side={side} /> : <b className="mission-name">{c.id}</b>}
              <span className="sec-vp">
                {done ? `${tab === 'achieved' ? 'Scored' : 'Discarded'} · ${roundText(done.round)}${tab === 'achieved' ? ` · ${c.vp} VP` : ''}` : `${c.vp} VP scored`}
              </span>
            </button>
          )
        })}
      </div>

      <footer className="sec-actions">
        {tab === 'hand' ? (
          <>
            <div className="sec-group">
              <span>{sel ? byId(sel.id)?.name : 'Select a card'}</span>
              <button onClick={() => setVp(Math.max(0, vp - 1))} disabled={!sel}>-</button>
              <b>{vp} VP</b>
              <button onClick={() => setVp(vp + 1)} disabled={!sel}>+</button>
              <button disabled={!sel || vp === 0 || !!warning} onClick={() => { if (sel) { g.scoreSecondary(side, sel.uid, vp); setSelected(undefined) } }}>Score (round {g.round})</button>
              <button disabled={!sel} onClick={() => { if (sel) { g.discardSecondary(side, sel.uid); setSelected(undefined) } }}>Discard</button>
            </div>
            <small className="muted">Round {g.round}: {p.secondaryVp[g.round - 1]}/{CAPS.secondaryRound} · Game: {gameTotal}/{CAPS.secondaryGame} ({room} VP can still be scored this round)</small>
            {warning && sel && <div className="cap-warn" role="alert">⚠ Can't score {vp} VP. {warning}</div>}
            <div className="sec-group">
              <button disabled={!pool.length} onClick={() => g.drawSecondaries(side, 1)}>Draw 1</button>
              <select value={toAdd} onChange={(e) => setToAdd(e.target.value)} aria-label="Add specific secondary">
                <option value="">Add specific...</option>
                {pool.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button disabled={!toAdd} onClick={() => { g.addSecondary(side, toAdd); setToAdd('') }}>Add</button>
              <button onClick={g.undo} disabled={!g.history.length}>Undo</button>
            </div>
            <small className="muted">Scored cards go to Achieved, discarded cards to Discarded. Discarding does not change CP; adjust CP manually.</small>
          </>
        ) : (
          <>
            <div className="sec-group">
              <span>{sel ? byId(sel.id)?.name : 'Select a card'}</span>
              <button disabled={!sel} onClick={() => { if (sel) { g.returnToHand(side, tab, sel.uid); setSelected(undefined) } }}>Return to hand</button>
              <button onClick={g.undo} disabled={!g.history.length}>Undo</button>
            </div>
            {tab === 'achieved' && <small className="muted">Returning a card keeps the VP already scored. Use the VP counter to take points off if it was a mistake.</small>}
          </>
        )}
      </footer>
    </div>
    </div>
  )
}
