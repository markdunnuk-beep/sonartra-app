const nodes = [
  { id: 'A', x: 64, y: 62 },
  { id: 'B', x: 178, y: 44 },
  { id: 'C', x: 302, y: 66 },
  { id: 'D', x: 122, y: 154 },
  { id: 'E', x: 244, y: 150 },
  { id: 'F', x: 346, y: 146 },
  { id: 'G', x: 82, y: 232 },
  { id: 'H', x: 196, y: 240 },
  { id: 'I', x: 314, y: 228 },
]

const links = [
  ['A', 'B'], ['B', 'C'], ['A', 'D'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['D', 'E'], ['E', 'F'], ['D', 'G'], ['D', 'H'], ['E', 'H'], ['E', 'I'], ['F', 'I'],
]

export function TeamNetworkMap() {
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]))

  return (
    <div className="visual-shell visual-grid-overlay rounded-2xl p-5">
      <p className="eyebrow">Team Intelligence Network</p>
      <svg viewBox="0 0 410 280" className="mt-4 h-full w-full" role="img" aria-label="Team intelligence compatibility network">
        {links.map(([from, to]) => {
          const a = nodeById[from]
          const b = nodeById[to]
          return <line key={`${from}-${to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-white/30" strokeWidth="1" />
        })}

        {nodes.map((node, index) => (
          <g key={node.id} className="intelligence-node-pulse" style={{ animationDelay: `${index * 0.25}s` }}>
            <circle cx={node.x} cy={node.y} r="9" className="fill-[#0f1725] stroke-[#bed2eb]/70" />
            <circle cx={node.x} cy={node.y} r="2.8" className="fill-[#ddeaff]" />
          </g>
        ))}
      </svg>
    </div>
  )
}
