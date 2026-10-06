import { bodyFor, type Mission, type Side } from '../store/game'

/** Renders a mission's structured text (when drawn, sections, VP entries). */
export default function CardBody({ mission, side }: { mission: Mission; side?: Side }) {
  const b = bodyFor(mission, side)
  const empty = !b.whenDrawn && !b.intro && b.sections.length === 0
  return (
    <div className="cardbody">
      <div className="cardbody-head">
        <b className="mission-name">{mission.name}</b>
        {mission.group && <span className="chip">{mission.group}{mission.mirror ? ' · Mirror' : ''}</span>}
        {b.kind && <span className="chip">{b.kind}</span>}
      </div>
      {mission.opponent && <div className="muted small">Played against: {mission.opponent}{mission.mirror ? ' (mirror)' : ''}</div>}
      {b.whenDrawn && <p className="when-drawn"><b>When drawn:</b> {b.whenDrawn}</p>}
      {b.intro && <p>{b.intro}</p>}
      {b.sections.map((s, i) => (
        <div key={i} className="cb-section">
          <div className="cb-heading">
            <span>{s.heading}</span>
            {s.tag && <span className="chip">{s.tag}</span>}
          </div>
          {s.when && <div className="cb-when"><b>When:</b> {s.when}</div>}
          <ul>
            {s.entries.map((e, j) => (
              <li key={j}>
                <span>{e.text}</span>
                {e.vp !== null && <b className="vp">{e.vp} VP</b>}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {b.notes && <p className="muted small">{b.notes}</p>}
      {empty && <p className="muted">No rules text yet.</p>}
    </div>
  )
}
