import { DIMENSIONS, dimLabel, type Dim } from '../data/dimensions'
import { BOARD, patterns, type Layout, type Zone } from '../data/layouts'

const pts = (v: [number, number][]) => v.map(([x, y]) => `${x},${y}`).join(' ')
const MARGIN = 4.5 // room outside the board for the board-size rulers
const MARGIN_LEFT = 6.5

function centroid(points: [number, number][]): [number, number] {
  let a = 0, cx = 0, cy = 0
  points.forEach(([x0, y0], i) => {
    const [x1, y1] = points[(i + 1) % points.length]
    const f = x0 * y1 - x1 * y0
    a += f; cx += (x0 + x1) * f; cy += (y0 + y1) * f
  })
  return a ? [cx / (3 * a), cy / (3 * a)] : points[0]
}

// `outside` puts a vertical arrow's label on the far (left) side of its line, for the board rulers
function Arrow({ d, outside = false }: { d: Dim; outside?: boolean }) {
  const [ix, iy] = d.inset ?? [0, 0]
  const [x1, y1, x2, y2] = [d.a[0] + ix, d.a[1] + iy, d.b[0] + ix, d.b[1] + iy]
  const horizontal = Math.abs(y2 - y1) < Math.abs(x2 - x1)
  const dx = outside ? -0.7 : 0.7
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="ls-dim" markerStart="url(#ls-arrow)" markerEnd="url(#ls-arrow)" />
      <text x={(x1 + x2) / 2 + (horizontal ? 0 : dx)} y={(y1 + y2) / 2 + (horizontal ? -0.7 : 0.5)}
        textAnchor={horizontal ? 'middle' : outside ? 'end' : 'start'} className="ls-dim-text">{dimLabel(d)}</text>
    </g>
  )
}

/** Top-down battlefield: deployment zones, terrain, objectives and zone measurements. */
export default function LayoutSvg({ layout, mini = false }: { layout: Layout; mini?: boolean }) {
  const pattern = patterns[layout.deployment]
  const m = mini ? 0 : MARGIN
  const ml = mini ? 0 : MARGIN_LEFT // wider: the left ruler's labels sit outside the board
  const { width: W, height: H } = BOARD
  const zoneLabel = (z: Zone) => {
    const [x, y] = centroid(z.points)
    return <text key={z.player} x={x} y={y} textAnchor="middle" className={`ls-label ls-${z.player}`}>{z.player.toUpperCase()}</text>
  }
  return (
    <svg className={`layout-svg ${mini ? 'mini' : ''}`} viewBox={`${-ml} ${-m} ${W + ml + m} ${H + 2 * m}`} role="img"
      aria-label={`${pattern?.name ?? 'Deployment'} layout ${layout.variant}`}>
      {!mini && (
        <defs>
          <marker id="ls-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="ls-arrowhead" />
          </marker>
        </defs>
      )}
      <rect width={W} height={H} className="ls-board" />
      {pattern?.zones.map((z, i) => (
        <polygon key={i} points={pts(z.points)} fill={z.color} fillOpacity={0.3} stroke={z.color} strokeOpacity={0.9} strokeWidth={0.2} />
      ))}
      {!mini && (
        <>
          <line x1={W / 2} y1={0} x2={W / 2} y2={H} className="ls-centre" />
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} className="ls-centre" />
        </>
      )}
      {layout.pieces.map((p, i) => (
        <g key={i}>
          <polygon points={pts(p.v)} className={`ls-piece ls-${p.t} ls-${p.c ?? 'plain'}`} />
          {p.w?.map((w, j) => <polyline key={j} points={pts(w.p)} className="ls-wall" strokeWidth={Math.max(w.k, 0.2)} />)}
        </g>
      ))}
      {layout.objectives.map(([x, y], i) => (
        <g key={i}>
          {!mini && <circle cx={x} cy={y} r={3} className="ls-obj-range" />}
          <circle cx={x} cy={y} r={mini ? 1.3 : 0.9} className="ls-obj" />
        </g>
      ))}
      {!mini && (
        <>
          {pattern?.zones.map(zoneLabel)}
          {(DIMENSIONS[layout.deployment] ?? []).map((d, i) => <Arrow key={i} d={d} />)}
          {/* board rulers: full size and the two halves that meet at the centre */}
          <Arrow d={{ a: [0, -1.8], b: [W / 2, -1.8] }} />
          <Arrow d={{ a: [W / 2, -1.8], b: [W, -1.8] }} />
          <Arrow outside d={{ a: [-1.8, 0], b: [-1.8, H / 2] }} />
          <Arrow outside d={{ a: [-1.8, H / 2], b: [-1.8, H] }} />
          <text x={W / 2} y={H + 2.6} textAnchor="middle" className="ls-dim-text">{W}" × {H}"</text>
        </>
      )}
    </svg>
  )
}
