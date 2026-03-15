export function ArchitectureDiagram() {
  return (
    <div className="visual-shell visual-grid-overlay interactive-surface rounded-2xl p-5">
      <svg viewBox="0 0 420 280" className="h-full w-full" role="img" aria-label="Triangulated architecture diagram of Sonartra intelligence layers">
        <circle cx="210" cy="140" r="108" className="fill-none stroke-white/10" />
        <circle cx="210" cy="140" r="82" className="fill-none stroke-white/10" />

        <line x1="210" y1="58" x2="102" y2="214" className="stroke-white/35" strokeWidth="1.1" />
        <line x1="102" y1="214" x2="318" y2="214" className="stroke-white/35" strokeWidth="1.1" />
        <line x1="318" y1="214" x2="210" y2="58" className="stroke-white/35" strokeWidth="1.1" />

        <line x1="210" y1="140" x2="210" y2="58" className="stroke-accent/30" strokeWidth="1" />
        <line x1="210" y1="140" x2="102" y2="214" className="stroke-accent/30" strokeWidth="1" />
        <line x1="210" y1="140" x2="318" y2="214" className="stroke-accent/30" strokeWidth="1" />

        <circle cx="210" cy="140" r="22" className="fill-accent/10 stroke-accent/30" />
        <text x="210" y="145" textAnchor="middle" className="fill-[#d5e6ff] text-[11px] tracking-[0.14em]">CORE</text>

        {[
          { x: 210, y: 58, label: 'Individual Intelligence', align: 'middle' },
          { x: 102, y: 214, label: 'Team Intelligence', align: 'end' },
          { x: 318, y: 214, label: 'Organisational Intelligence', align: 'start' },
        ].map((node) => (
          <g key={node.label}>
            <circle cx={node.x} cy={node.y} r="8" className="fill-[#0f1725] stroke-[#bed4ef]/70" />
            <text
              x={node.x}
              y={node.y === 58 ? node.y - 18 : node.y + 24}
              textAnchor={node.align as 'start' | 'middle' | 'end'}
              className="fill-[#a7bcd7] text-[11px]"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
