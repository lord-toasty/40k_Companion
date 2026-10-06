import { useEffect } from 'react'
import type { Army } from '../schema/army'

/** The army rule, its abilities (Ka'tahs for Custodes) and the keyword definitions that go with it. */
export default function ArmyRuleInfo({ army, hideName = false }: { army: Army; hideName?: boolean }) {
  const rule = army.armyRule
  if (!rule) return <p className="muted">This army has no army rule yet.</p>
  const keywords = (army.armyRuleKeywords ?? [])
    .map((term) => army.keywordDefinitions?.find((k) => k.term === term))
    .filter((k): k is { term: string; text: string } => !!k)

  return (
    <div className="det-info">
      {!hideName && <div className="det-head"><h4>{rule.name}</h4><span className="badge">Army rule</span></div>}
      <div className="det-block">
        <p>{rule.text}</p>
      </div>

      {army.katahs && army.katahs.length > 0 && (
        <div className="det-block">
          {army.katahs.map((k) => (
            <div key={k.name} className="det-card">
              <div className="det-card-head"><b>{k.name}</b></div>
              <p><b>When:</b> {k.timing}</p>
              <p><b>Effect:</b> {k.text}</p>
            </div>
          ))}
        </div>
      )}

      {keywords.length > 0 && (
        <div className="det-block">
          <h5>Keyword definitions</h5>
          {keywords.map((k) => (
            <div key={k.term} className="det-card">
              <div className="det-card-head"><b>{k.term}</b></div>
              <p>{k.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ArmyRuleModal({ army, onClose }: { army: Army; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal det-modal" role="dialog" aria-label={`${army.armyRule?.name ?? 'Army'} rule`} onClick={(e) => e.stopPropagation()}>
        <div className="ds-title">
          <h2>{army.armyRule?.name ?? 'Army rule'}</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <ArmyRuleInfo army={army} hideName />
      </div>
    </div>
  )
}
