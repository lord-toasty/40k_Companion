import { useEffect, useState, type ReactNode } from 'react'
import { datasheetFor, type Enhancement, type Loadout, type Unit, type Weapon } from '../schema/army'
import { effectText, resolveSheet, withEnhancement } from './loadout'

const STAT_COLS = ['M', 'T', 'Sv', 'W', 'LD', 'OC', 'InSv', 'Base'] as const

function Section({ title, summary, children }: { title: string; summary?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="ds-section">
      <button className="ds-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <b>{title}</b> {summary && <span>{summary}</span>}
        <i>{open ? '▼' : '◀'}</i>
      </button>
      {open && children}
    </div>
  )
}

export function WeaponTable({ title, weapons, skill }: { title: string; weapons: (Weapon & { count?: number })[]; skill: string }) {
  if (!weapons.length) return null
  return (
    <table className="ds-table ds-weapons">
      <thead>
        <tr><th>{title}</th><th>Range</th><th>A</th><th>{skill}</th><th>S</th><th>AP</th><th>D</th><th>Keywords</th></tr>
      </thead>
      <tbody>
        {weapons.map((w) => (
          <tr key={w.name}>
            <td>{w.name}{w.count !== undefined ? ` (x${w.count})` : ''}</td><td>{w.range}</td><td>{w.attacks}</td><td>{w.skill}</td>
            <td>{w.strength}</td><td>{w.ap}</td><td>{w.damage}</td>
            <td className="kw">{w.keywords.map((k) => <div key={k}>{k}</div>)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * `allOptions` (catalogue eye) lists every weapon and ability the unit can take, with no counts;
 * otherwise (roster eye) only what the entry's loadout carries.
 */
export default function DatasheetModal({ unit, models, loadout, enhancement, allOptions = false, onClose }: { unit: Unit; models: number; loadout?: Loadout; enhancement?: Enhancement; allOptions?: boolean; onClose: () => void }) {
  const ds = allOptions ? datasheetFor(unit) : withEnhancement(resolveSheet(unit, models, loadout), enhancement)
  const hasChoices = (unit.slots ?? []).length > 0
  const cols = STAT_COLS.filter((k) => ds.stats[k] !== undefined)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const enh = allOptions ? undefined : enhancement
  const rules = [...(ds.core ?? []), ...(ds.armyRules ?? [])]
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label={`${unit.name} datasheet`} onClick={(e) => e.stopPropagation()}>
        <div className="ds-title">
          <h2>{unit.name}</h2>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        {hasChoices && <p className="muted small ds-mode">{allOptions ? 'Showing all wargear options.' : 'Showing the equipped loadout only.'}</p>}

        <Section title="Models" summary={`(${models})`}>
          <table className="ds-table ds-stats">
            <thead><tr><th>Unit</th>{cols.map((k) => <th key={k}>{k === 'InSv' ? 'InSv' : k}</th>)}</tr></thead>
            <tbody><tr><td>{unit.name} (x{models})</td>{cols.map((k) => <td key={k}>{ds.stats[k]}</td>)}</tr></tbody>
          </table>
          <WeaponTable title="Ranged Weapons" weapons={ds.ranged} skill="BS" />
          <WeaponTable title="Melee Weapons" weapons={ds.melee} skill="WS" />
          {ds.weaponNotes?.map((n) => <p key={n} className="muted small">{n}</p>)}
        </Section>

        <Section title="Abilities" summary={ds.abilities.map((a) => a.name).join(', ')}>
          <ul className="ds-abilities">
            {ds.abilities.map((a) => (
              <li key={a.name}><b>{a.name}</b>{a.text && <span>{a.text}</span>}</li>
            ))}
          </ul>
        </Section>

        {enh && (
          <Section title="Enhancements" summary={enh.name}>
            <ul className="ds-abilities">
              <li><b>{enh.name}</b>{effectText(enh) && <span>{effectText(enh)}</span>}</li>
            </ul>
          </Section>
        )}

        <Section title="Rules" summary={rules.join(', ')}>
          {unit.leadsText && (
            <ul className="ds-abilities">
              <li><b>Leader</b><span>{unit.leadsText}</span></li>
            </ul>
          )}
        </Section>

        {(ds.composition || ds.wargearOptions?.length) && (
          <Section title="Composition & options">
            {ds.composition && <p className="ds-text"><b>Unit composition:</b> {ds.composition}</p>}
            {ds.wargearOptions && ds.wargearOptions.length > 0 && (
              <ul className="ds-text">{ds.wargearOptions.map((o) => <li key={o}>{o}</li>)}</ul>
            )}
          </Section>
        )}

        <p className="ds-keywords">
          <b>Keywords:</b> {ds.keywords.map((k) => <span key={k} className="chip">{k}</span>)}
          {ds.factionKeywords && ds.factionKeywords.length > 0 && (
            <>
              {' '}<b>Faction:</b> {ds.factionKeywords.map((k) => <span key={k} className="chip">{k}</span>)}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
