import Eye from '../components/Eye'
import type { GearChoice, GearSlot, Loadout, Unit } from '../schema/army'
import { headroom, selectChoice, setChoiceCount, slotCounts } from './loadout'

interface Props {
  unit: Unit
  slot: GearSlot
  models: number
  loadout?: Loadout
  onChange: (next: Loadout) => void
  onView: (choice: GearChoice) => void
}

/**
 * One wargear decision. A yes/no add-on is a checkbox, a single model picks one option (radio), and a squad
 * gets a stepper per option, capped so the total never exceeds the models or the option's limit.
 */
export default function SlotControl({ unit, slot, models, loadout, onChange, onView }: Props) {
  const counts = slotCounts(slot, models, loadout)
  const [first, ...rest] = slot.choices
  const eye = (c: GearChoice) => (c.gear.length ? <Eye label={`${c.label} datasheet`} onClick={() => onView(c)} /> : <span className="icon-gap" />)
  const pts = (c: GearChoice) => (c.points ? <small className="pts">+{c.points} pts</small> : null)

  // add-on: one optional extra, with nothing carried by default
  if (slot.choices.length === 2 && !first.gear.length && (models === 1 || slot.limit?.[rest[0].id] === 1)) {
    const c = rest[0]
    return (
      <div className="slot">
        <b>{slot.label}</b>
        <label className="check slot-row">
          {eye(c)}
          <input type="checkbox" checked={counts[c.id] > 0} onChange={(e) => onChange(setChoiceCount(unit, models, loadout, slot.id, c.id, e.target.checked ? 1 : 0))} />
          <span>{c.label}</span>{pts(c)}
        </label>
      </div>
    )
  }

  if (models === 1) {
    return (
      <div className="slot">
        <b>{slot.label}</b>
        {slot.choices.map((c) => (
          <label key={c.id} className="check slot-row">
            {eye(c)}
            <input type="radio" name={`${unit.id}-${slot.id}`} checked={counts[c.id] === 1} onChange={() => onChange(selectChoice(unit, models, loadout, slot.id, c.id))} />
            <span>{c.label}</span>{pts(c)}
          </label>
        ))}
      </div>
    )
  }

  return (
    <div className="slot">
      <b>{slot.label} <small className="muted">({models} models)</small></b>
      <div className="slot-row">
        {eye(first)}
        <span>{first.label}</span>{pts(first)}
        <span className="stepper"><b>× {counts[first.id]}</b></span>
      </div>
      {rest.map((c) => {
        const room = headroom(unit, slot, c.id, models, loadout)
        const n = counts[c.id]
        return (
          <div key={c.id} className="slot-row">
            {eye(c)}
            <span>{c.label}</span>{pts(c)}
            <span className="stepper">
              <button disabled={n === 0} onClick={() => onChange(setChoiceCount(unit, models, loadout, slot.id, c.id, n - 1))} aria-label={`Fewer ${c.label}`}>−</button>
              <b>{n}</b>
              <button disabled={room === 0} onClick={() => onChange(setChoiceCount(unit, models, loadout, slot.id, c.id, n + 1))} aria-label={`More ${c.label}`}>+</button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
