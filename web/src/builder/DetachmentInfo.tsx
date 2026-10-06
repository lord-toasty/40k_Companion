import { useEffect } from 'react'
import type { Army, Detachment } from '../schema/army'

/** Everything about a detachment: rules, favoured Ka'tah, enhancements, phase options and stratagems. */
export default function DetachmentInfo({ army, detachment: d, hideName = false }: { army: Army; detachment: Detachment; hideName?: boolean }) {
  return (
    <div className="det-info">
      <div className="det-head">
        {hideName ? <span /> : <h4>{d.name}</h4>}
        <span className="badge">{d.dp === undefined ? 'DP ?' : `${d.dp} DP`}</span>
      </div>

      {d.rule && (
        <div className="det-block">
          <h5>Detachment rule</h5>
          <p><b>{d.rule.name}.</b> {d.rule.text}</p>
        </div>
      )}
      {d.favouredKatah && (
        <div className="det-block">
          <h5>Favoured Ka'tah</h5>
          <p><b>{d.favouredKatah.name}.</b> {d.favouredKatah.text}</p>
        </div>
      )}
      {d.extraRules?.map((r) => (
        <div key={r.name} className="det-block"><p><b>{r.name}.</b> {r.text}</p></div>
      ))}
      {d.unique && <p className="muted small"><b>Unique: {d.unique.group}.</b> {d.unique.text}</p>}

      {d.enhancements.length > 0 && (
        <div className="det-block">
          <h5>Enhancements</h5>
          {d.enhancements.map((e) => (
            <div key={e.id} className="det-card">
              <div className="det-card-head"><b>{e.name}{e.upgrade && <span className="chip">Upgrade · up to {e.upgrade.maxUnits} unit{e.upgrade.maxUnits === 1 ? '' : 's'}</span>}</b><span className="vp">{e.points} pts</span></div>
              {e.aka && <p className="muted small">Also listed as "{e.aka}"</p>}
              {e.text && <p>{e.text}</p>}
            </div>
          ))}
          <p className="muted small">
            Enhancements go on Characters, once per army. Upgrades can go on a Character (once per army) or on non-Character units (up to the unit limit shown; one slot however many units carry it, each pays the points). Max {army.maxEnhancements?.default ?? 4} slots per army ({army.maxEnhancements?.incursion ?? 2} at Incursion).
          </p>
        </div>
      )}

      {d.phaseOptions && d.phaseOptions.some((p) => p.options.length) && (
        <div className="det-block">
          <h5>Phase options</h5>
          <table className="det-phases">
            <tbody>
              {d.phaseOptions.filter((p) => p.options.length).map((p) => (
                <tr key={p.phase}><th>{p.phase}</th><td>{p.options.join(' · ')}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {d.stratagems && d.stratagems.length > 0 && (
        <div className="det-block">
          <h5>Stratagems</h5>
          {d.stratagems.map((s) => (
            <div key={s.id} className="det-card">
              <div className="det-card-head">
                <b>{s.name}</b>
                <span><span className="chip">{s.turn}</span> <span className="vp">{s.cp} CP</span></span>
              </div>
              <p><b>When:</b> {s.when}</p>
              <p><b>Target:</b> {s.target}</p>
              <p><b>Effect:</b> {s.effect}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function DetachmentModal({ army, detachment, onClose }: { army: Army; detachment: Detachment; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal det-modal" role="dialog" aria-label={`${detachment.name} detachment`} onClick={(e) => e.stopPropagation()}>
        <div className="ds-title">
          <h2>{detachment.name}</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <DetachmentInfo army={army} detachment={detachment} hideName />
      </div>
    </div>
  )
}
