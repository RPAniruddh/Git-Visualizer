// SVG renderers for the two graph flavors. Layout data comes from
// lib/graphRender.js (designed before/after states) and lib/gitSim.js (live sim).

const SMOOTH = 'cubic-bezier(.25,.8,.35,1)';

/** Designed before/after lesson graph. Entrance animations only run while `animate` is true. */
export function LessonGraph({ layout, animate }) {
  const nodeAnim = animate ? `gvPop .75s ${SMOOTH} both` : 'none';
  const edgeAnim = animate ? 'gvDraw .8s cubic-bezier(.45,.05,.35,1) both' : 'none';
  return (
    <svg viewBox={layout.vb} style={{ width: '100%', maxWidth: 820, margin: '0 auto', minHeight: 200, maxHeight: 330, display: 'block' }}>
      {layout.edges.map((e, i) => (
        <path key={i} d={e.d} pathLength="1" stroke={e.color} strokeWidth="2.5" fill="none" opacity={e.op} style={{ strokeDasharray: 1, animation: edgeAnim }} />
      ))}
      {layout.nodes.map((n) => (
        <g key={n.id} style={{ transform: `translate(${n.x}px,${n.y}px)`, transition: `transform .75s ${SMOOTH}` }}>
          <circle r="21" fill="none" stroke={n.haloStroke} strokeWidth="1.5" strokeDasharray={n.haloDash} opacity={n.haloOp} />
          <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: nodeAnim }}>
            <circle r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={n.sw} strokeDasharray={n.dash} opacity={n.op} />
            <text y="4" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10.5" fontWeight="500" fill={n.hashFill} opacity={n.op}>
              {n.hash}
            </text>
          </g>
        </g>
      ))}
      {layout.labels.map((lb, i) => (
        <g key={i} style={{ transform: `translate(${lb.x}px,${lb.y}px)`, transition: `transform .75s ${SMOOTH}` }}>
          <rect x={lb.rx} y="-12" width={lb.w} height="24" rx="12" fill={lb.fill} stroke={lb.stroke} strokeWidth="1.4" strokeDasharray={lb.dash} />
          <text textAnchor="middle" y="4" fontFamily="JetBrains Mono" fontSize="11" fontWeight="500" fill={lb.tfill}>
            {lb.text}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Live sandbox graph — nodes pop as commands create them. */
export function LiveGraph({ layout }) {
  const trans = `transform .7s ${SMOOTH}`;
  return (
    <svg viewBox={layout.vb} style={{ width: '100%', maxWidth: 820, margin: '0 auto', minHeight: 170, maxHeight: 300, display: 'block' }}>
      {layout.edges.map((e, i) => (
        <path key={i} d={e.d} pathLength="1" stroke={e.color} strokeWidth="2" fill="none" opacity={e.op} style={{ strokeDasharray: 1, animation: 'gvDraw .5s ease both' }} />
      ))}
      {layout.nodes.map((n) => (
        <g key={n.id} style={{ transform: `translate(${n.x}px,${n.y}px)`, transition: trans }}>
          <g style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `gvPop .5s ${SMOOTH} both` }}>
            <circle r="18" fill="none" stroke={n.haloStroke} strokeWidth="1.5" opacity={n.haloOp} />
            <circle r={n.r} fill={n.fill} stroke={n.stroke} strokeWidth={n.sw} strokeDasharray={n.dash} opacity={n.op} />
            <text y="26" textAnchor="middle" fontFamily="JetBrains Mono" fontSize="10" fill="#9AA3B5" opacity={n.op}>
              {n.hash}
            </text>
          </g>
        </g>
      ))}
      {layout.labels.map((lb, i) => (
        <g key={i} style={{ transform: `translate(${lb.x}px,${lb.y}px)`, transition: trans }}>
          <rect x={lb.rx} y="-12" width={lb.w} height="24" rx="12" fill={lb.fill} stroke={lb.stroke} strokeWidth="1.2" strokeDasharray={lb.dash} />
          <text textAnchor="middle" y="4" fontFamily="JetBrains Mono" fontSize="11" fill={lb.tfill}>
            {lb.text}
          </text>
        </g>
      ))}
    </svg>
  );
}
