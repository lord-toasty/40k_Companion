import { useEffect } from 'react'
import type { GearChoice, Unit } from '../schema/army'
import { WeaponTable } from './DatasheetModal'
import { gearSheet } from './loadout'

/** Small popout for one wargear option: just its weapon row(s) and/or ability text. */
export default function GearModal({ unit, choice, onClose }: { unit: Unit; choice: GearChoice; onClose: () => void }) {
  const g = gearSheet(unit, choice)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal gear-modal" role="dialog" aria-label={`${choice.label} datasheet`} onClick={(e) => e.stopPropagation()}>
        <div className="ds-title">
          <h2>{choice.label}</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="muted small gear-for">Wargear for {unit.name}</p>
        <WeaponTable title="Ranged Weapons" weapons={g.ranged} skill="BS" />
        <WeaponTable title="Melee Weapons" weapons={g.melee} skill="WS" />
        {g.abilities.length > 0 && (
          <ul className="ds-abilities">
            {g.abilities.map((a) => <li key={a.name}><b>{a.name}</b><span>{a.text}</span></li>)}
          </ul>
        )}
        {!g.ranged.length && !g.melee.length && !g.abilities.length && <p className="muted">No datasheet entry for this option.</p>}
      </div>
    </div>
  )
}
