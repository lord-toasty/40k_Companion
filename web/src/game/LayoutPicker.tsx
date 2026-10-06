import LayoutSvg from '../components/LayoutSvg'
import { layoutsFor, patterns } from '../data/layouts'
import { useGame } from '../store/game'

/** Deployment + terrain layout for the chosen disposition matchup: three variants to click through. */
export default function LayoutPicker() {
  const { players, layoutVariant, setLayoutVariant } = useGame()
  const a = players.attacker.disposition
  const d = players.defender.disposition
  const layouts = a && d ? layoutsFor(a, d) : []
  const layout = layouts[layoutVariant] ?? layouts[0]

  return (
    <div className="layout-picker">
      <h4>Deployment &amp; layout</h4>
      {!layout ? (
        <p className="muted">Choose both players' dispositions to see the deployment and terrain layouts.</p>
      ) : (
        <>
          <div className="layout-head">
            <button onClick={() => setLayoutVariant(layoutVariant - 1)} disabled={layoutVariant === 0} aria-label="Previous layout">◀</button>
            <div className="layout-title">
              <b>{patterns[layout.deployment]?.name ?? layout.deployment}</b>
              <span className="muted"> · Layout {layout.variant} of {layouts.length}</span>
            </div>
            <button onClick={() => setLayoutVariant(layoutVariant + 1)} disabled={layoutVariant >= layouts.length - 1} aria-label="Next layout">▶</button>
          </div>
          <LayoutSvg layout={layout} />
          <div className="layout-thumbs">
            {layouts.map((l, i) => (
              <button key={l.variant} className={`thumb ${l === layout ? 'on' : ''}`} onClick={() => setLayoutVariant(i)} aria-label={`Layout ${l.variant}: ${patterns[l.deployment]?.name}`}>
                <LayoutSvg layout={l} mini />
                <span>{patterns[l.deployment]?.name}</span>
              </button>
            ))}
          </div>
          <p className="muted small">{patterns[layout.deployment]?.description}</p>
        </>
      )}
    </div>
  )
}
