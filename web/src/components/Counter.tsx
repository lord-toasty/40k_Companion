interface Props {
  label: string
  value: number
  onChange: (delta: number) => void
  atMax?: boolean // disables plus
  note?: string // small running total, e.g. "12/45 game"
}

export default function Counter({ label, value, onChange, atMax, note }: Props) {
  return (
    <div className="counter">
      <span>{label}</span>
      <button onClick={() => onChange(-1)} aria-label={`${label} minus`}>-</button>
      <b>{value}</b>
      <button onClick={() => onChange(1)} disabled={atMax} aria-label={`${label} plus`}>+</button>
      {note && <small className={`counter-note ${atMax ? 'full' : ''}`}>{note}</small>}
    </div>
  )
}
