import { byId, byType, type MissionType } from '../store/game'
import CardBody from './CardBody'

interface Props {
  title: string
  type: MissionType
  value?: string
  onPick: (id?: string) => void
}

export default function CardPicker({ title, type, value, onPick }: Props) {
  const card = byId(value)
  const options = byType(type)
  return (
    <div className="card-slot">
      <h4>{title}</h4>
      <div className="mission">
        {card ? <CardBody mission={card} /> : <span className="muted">None selected</span>}
      </div>
      <select value={value ?? ''} onChange={(e) => onPick(e.target.value || undefined)} disabled={!options.length}>
        <option value="">{options.length ? '-- choose --' : 'No entries yet'}</option>
        {options.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  )
}
