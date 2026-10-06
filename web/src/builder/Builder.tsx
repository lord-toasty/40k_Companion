import { useState } from 'react'
import { armies, armyList } from '../armies'
import Eye from '../components/Eye'
import { ROLES, ROLE_LABELS, sizeName, sizeOf, type Detachment, type Enhancement, type GearChoice, type Loadout, type Unit } from '../schema/army'
import { blank, useBuilder } from '../store/builder'
import ArmyRuleInfo, { ArmyRuleModal } from './ArmyRuleInfo'
import DatasheetModal from './DatasheetModal'
import DetachmentInfo, { DetachmentModal } from './DetachmentInfo'
import EnhancementModal from './EnhancementModal'
import GearModal from './GearModal'
import { loadoutSummary, normalizeLoadout } from './loadout'
import { copyNumber, defaultEntryPrice, detachmentPointsUsed, entryPoints, exportText, pointsFor, rosterPoints, selectedDetachments, validate } from './points'
import SlotControl from './SlotControl'

export default function Builder() {
  const b = useBuilder()
  const army = armies[b.armyId]
  const roster = b.rosters[b.armyId] ?? blank(b.armyId)
  const [selected, setSelected] = useState<string>() // roster entry shown in the right panel
  const [selectedDet, setSelectedDet] = useState<string>() // or a detachment shown there
  const [ruleSelected, setRuleSelected] = useState(false) // or the army rule
  const [ruleModal, setRuleModal] = useState(false)
  const [sheet, setSheet] = useState<{ unit: Unit; models: number; loadout?: Loadout; all?: boolean }>()
  const [gear, setGear] = useState<{ unit: Unit; choice: GearChoice }>()
  const [enhView, setEnhView] = useState<{ enhancement: Enhancement; detachment: string }>()
  const [detModal, setDetModal] = useState<Detachment>()
  const [panel, setPanel] = useState<'export' | 'notes' | undefined>()

  const total = rosterPoints(army, roster)
  const dp = detachmentPointsUsed(army, roster)
  const dpUnknown = army.detachments.some((d) => d.dp === undefined)
  const issues = validate(army, roster)
  const dets = selectedDetachments(army, roster)
  const enhancements = dets.flatMap((d) => d.enhancements.map((e) => ({ ...e, detachment: d.name })))
  const sel = roster.entries.find((e) => e.uid === selected)
  const selUnit = sel && army.units.find((u) => u.id === sel.unitId)
  const infoDet = army.detachments.find((d) => d.id === selectedDet)

  const toggleDet = (id: string) =>
    b.update({ detachmentIds: roster.detachmentIds.includes(id) ? roster.detachmentIds.filter((x) => x !== id) : [...roster.detachmentIds, id] })
  const pickEntry = (uid: string) => { setSelected(uid); setSelectedDet(undefined); setRuleSelected(false) }
  const pickDet = (id: string) => { setSelectedDet(id); setSelected(undefined); setRuleSelected(false) }
  const pickRule = () => { setRuleSelected(true); setSelected(undefined); setSelectedDet(undefined) }

  return (
    <div className="builder">
      <section className="bar">
        <select value={b.armyId} onChange={(e) => { b.setArmy(e.target.value); setSelected(undefined); setSelectedDet(undefined); setRuleSelected(false) }} aria-label="Army">
          {armyList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <input value={roster.name} onChange={(e) => b.update({ name: e.target.value })} aria-label="List name" />
        <select value={roster.limit} onChange={(e) => b.update({ limit: +e.target.value })} aria-label="Points limit">
          {[500, 1000, 2000, 3000].map((n) => <option key={n} value={n}>{n} pts</option>)}
        </select>
        <b className={total > roster.limit ? 'bad' : ''}>{total} / {roster.limit} pts</b>
      </section>
      {issues.length > 0 && <ul className="issues">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}

      <div className="cols">
        {/* LEFT: detachments + catalogue */}
        <aside className="col">
          {army.armyRule && (
            <>
              <h3 className="panel-title">Army Rule</h3>
              <ul className="rows">
                <li className={ruleSelected ? 'on' : ''} onClick={pickRule}>
                  <Eye label={`${army.armyRule.name} army rule`} onClick={() => setRuleModal(true)} />
                  <span>{army.armyRule.name}</span>
                </li>
              </ul>
            </>
          )}
          <h3 className="panel-title">
            Detachment <span className={`badge ${dp > army.detachmentPoints ? 'bad' : ''}`}>{dp} / {army.detachmentPoints} DP</span>
          </h3>
          {dpUnknown && <p className="muted small">DP costs aren't in the source yet, so they count as 0.</p>}
          <ul className="rows">
            {army.detachments.map((d) => (
              <li key={d.id} className={`${roster.detachmentIds.includes(d.id) ? 'chosen' : ''} ${d.id === selectedDet ? 'on' : ''}`} onClick={() => pickDet(d.id)}>
                <Eye label={`${d.name} detachment`} onClick={() => setDetModal(d)} />
                <span>{d.name} <small>{d.dp === undefined ? 'DP ?' : `${d.dp} DP`}</small></span>
                <button onClick={(e) => { e.stopPropagation(); toggleDet(d.id) }} aria-label={`${roster.detachmentIds.includes(d.id) ? 'Remove' : 'Add'} ${d.name}`}>
                  {roster.detachmentIds.includes(d.id) ? '−' : '+'}
                </button>
              </li>
            ))}
          </ul>

          {ROLES.map((role) => {
            const units = army.units.filter((u) => u.role === role)
            if (!units.length) return null
            return (
              <div key={role}>
                <h3 className="panel-title">{ROLE_LABELS[role]}</h3>
                <ul className="rows">
                  {units.map((u) => {
                    // cost of the NEXT copy of this datasheet, one price per size option
                    const copies = roster.entries.filter((e) => e.unitId === u.id).length
                    const full = !!u.maxPerList && copies >= u.maxPerList
                    return (
                      <li key={u.id}>
                        <Eye label={`${u.name} datasheet`} onClick={() => setSheet({ unit: u, models: u.sizes[0].models, all: true })} />
                        <span>{u.name}</span>
                        <small className="pts" title={u.sizes.map((s) => `${sizeName(s)} models: ${defaultEntryPrice(u, s, copies + 1)} pts`).join('\n')}>
                          {full ? 'max' : u.sizes.map((s) => defaultEntryPrice(u, s, copies + 1)).join(' / ')}
                        </small>
                        <button disabled={full} onClick={() => b.addEntry({ unitId: u.id, sizeKey: u.sizes[0].key })} aria-label={`Add ${u.name}`}>+</button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </aside>

        {/* MIDDLE: roster */}
        <section className="col">
          <h3 className="panel-title">Roster <span className="badge">{roster.entries.length} units</span></h3>
          {dets.length > 0 && <p className="dets">{dets.map((d) => d.name).join(' + ')}</p>}
          {roster.entries.length === 0 && <p className="muted">Add units from the left.</p>}
          {ROLES.map((role) => {
            const entries = roster.entries.filter((e) => army.units.find((u) => u.id === e.unitId)?.role === role)
            if (!entries.length) return null
            return (
              <div key={role}>
                <h4 className="role-head">{ROLE_LABELS[role]}</h4>
                <ul className="rows">
                  {entries.map((e) => {
                    const u = army.units.find((x) => x.id === e.unitId)!
                    const s = sizeOf(u, e.sizeKey)
                    const enh = enhancements.find((x) => x.id === e.enhancementId)
                    return (
                      <li key={e.uid} className={e.uid === selected ? 'on' : ''} onClick={() => pickEntry(e.uid)}>
                        <Eye label={`${u.name} datasheet`} onClick={() => setSheet({ unit: u, models: s.models, loadout: e.loadout })} />
                        <span className="grow">
                          {s.models} {u.name}{s.label ? ` ${s.label}` : ''} <small className="pts">{entryPoints(army, e, roster)} pts</small>
                          {loadoutSummary(u, s.models, e.loadout).map((g) => <em key={g} className="sub"> • {g}</em>)}
                          {enh && <em className="sub"> • {enh.name}</em>}
                        </span>
                        <button onClick={(ev) => { ev.stopPropagation(); b.removeEntry(e.uid); if (selected === e.uid) setSelected(undefined) }} aria-label={`Remove ${u.name}`}>🗑</button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}

          <div className="row-btns">
            <button onClick={() => setPanel(panel === 'export' ? undefined : 'export')}>Export</button>
            <button onClick={() => setPanel(panel === 'notes' ? undefined : 'notes')}>Notes</button>
            <button onClick={() => confirm('Clear this list?') && b.reset()}>Clear</button>
          </div>
          {panel === 'export' && (
            <>
              <pre>{exportText(army, roster)}</pre>
              <button onClick={() => navigator.clipboard?.writeText(exportText(army, roster))}>Copy</button>
            </>
          )}
          {panel === 'notes' && <textarea rows={8} value={roster.notes} onChange={(e) => b.update({ notes: e.target.value })} />}
        </section>

        {/* RIGHT: options for the selected unit, or details of the selected detachment */}
        <aside className="col">
          <h3 className="panel-title">Wargear &amp; Options</h3>
          {ruleSelected ? (
            <ArmyRuleInfo army={army} />
          ) : infoDet ? (
            <DetachmentInfo army={army} detachment={infoDet} />
          ) : !sel || !selUnit ? (
            <p className="muted">Select a unit in the roster, or a detachment on the left, to see its options.</p>
          ) : (
            <div className="opts">
              <h4>{selUnit.name}</h4>
              <label>Unit size
                <select value={sel.sizeKey} onChange={(e) => {
                  const next = selUnit.sizes.find((z) => z.key === e.target.value)!
                  // a smaller unit can't keep more axes than it has models, so re-clamp the loadout
                  b.patchEntry(sel.uid, { sizeKey: next.key, loadout: normalizeLoadout(selUnit, next.models, sel.loadout) })
                }}>
                  {selUnit.sizes.map((s) => (
                    <option key={s.key} value={s.key}>{sizeName(s)} models · {pointsFor(s.points, copyNumber(roster, sel))} pts</option>
                  ))}
                </select>
              </label>
              <p className="muted small">
                Copy {copyNumber(roster, sel)} of this datasheet. Cost: {sizeOf(selUnit, sel.sizeKey).points.join(' / ')} pts (1st / 2nd / 3rd{sizeOf(selUnit, sel.sizeKey).points.length > 3 ? ' / 4th+' : '+'}).
              </p>
              {(selUnit.slots ?? []).map((slot) => (
                <SlotControl key={slot.id} unit={selUnit} slot={slot} models={sizeOf(selUnit, sel.sizeKey).models} loadout={sel.loadout}
                  onChange={(loadout) => b.patchEntry(sel.uid, { loadout })} onView={(choice) => setGear({ unit: selUnit, choice })} />
              ))}
              {selUnit.datasheet?.composition && <p className="ds-text composition"><b>Unit composition:</b> {selUnit.datasheet.composition}</p>}
              {(selUnit.datasheet?.wargearOptions ?? []).length > 0 && (
                <details className="muted small">
                  <summary>Wargear rules (as printed)</summary>
                  <ul className="ds-text">{selUnit.datasheet!.wargearOptions!.map((o) => <li key={o}>{o}</li>)}</ul>
                </details>
              )}
              {selUnit.role === 'Character' ? (
                <div>
                  <b>Enhancement</b>
                  {!enhancements.length ? (
                    <p className="muted small">Add a detachment first.</p>
                  ) : (
                    <div className="enh-list">
                      <label className={`enh-opt ${!sel.enhancementId ? 'on' : ''}`}>
                        <input type="radio" name="enhancement" checked={!sel.enhancementId} onChange={() => b.patchEntry(sel.uid, { enhancementId: undefined })} />
                        <span>None</span>
                      </label>
                      {enhancements.map((x) => {
                        // one of each enhancement per army
                        const takenElsewhere = roster.entries.some((o) => o.uid !== sel.uid && o.enhancementId === x.id)
                        return (
                          <label key={x.id} className={`enh-opt ${sel.enhancementId === x.id ? 'on' : ''} ${takenElsewhere ? 'disabled' : ''}`}>
                            <input type="radio" name="enhancement" disabled={takenElsewhere} checked={sel.enhancementId === x.id}
                              onChange={() => b.patchEntry(sel.uid, { enhancementId: x.id })} />
                            <span>{x.name} (+{x.points}){takenElsewhere ? ' · already used' : ''}<small>{x.detachment}</small></span>
                            <Eye label={`${x.name} enhancement`} onClick={() => setEnhView({ enhancement: x, detachment: x.detachment })} />
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="muted small">Only Characters can take enhancements.</p>
              )}
            </div>
          )}
        </aside>
      </div>

      {sheet && <DatasheetModal unit={sheet.unit} models={sheet.models} loadout={sheet.loadout} allOptions={sheet.all} onClose={() => setSheet(undefined)} />}
      {enhView && <EnhancementModal enhancement={enhView.enhancement} detachment={enhView.detachment} onClose={() => setEnhView(undefined)} />}
      {ruleModal && <ArmyRuleModal army={army} onClose={() => setRuleModal(false)} />}
      {gear && <GearModal unit={gear.unit} choice={gear.choice} onClose={() => setGear(undefined)} />}
      {detModal && <DetachmentModal army={army} detachment={detModal} onClose={() => setDetModal(undefined)} />}
    </div>
  )
}
