export function HeroIntelligenceMap() {
  return (
    <div className="visual-shell visual-grid-overlay relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(111,177,255,0.1),transparent_56%)]" />
      <svg viewBox="0 0 460 460" className="relative z-10 h-full w-full" role="img" aria-label="Intelligence map showing the three-layer Sonartra model">
        <defs>
          <linearGradient id="hero-link" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(166,196,232,0.58)" />
            <stop offset="100%" stopColor="rgba(88,153,226,0.26)" />
          </linearGradient>
        </defs>

        {[56, 96, 136, 176].map((radius) => (
          <circle key={radius} cx="230" cy="230" r={radius} className="fill-none stroke-white/10" strokeWidth="1" />
        ))}

        <circle cx="230" cy="230" r="148" className="fill-none stroke-accent/20 intelligence-rotate" strokeDasharray="5 10" />
        <circle cx="230" cy="230" r="112" className="fill-none stroke-accent/25 intelligence-rotate-reverse" strokeDasharray="3 9" />

        <line x1="230" y1="98" x2="122" y2="312" stroke="url(#hero-link)" strokeWidth="1.2" />
        <line x1="122" y1="312" x2="338" y2="312" stroke="url(#hero-link)" strokeWidth="1.2" />
        <line x1="338" y1="312" x2="230" y2="98" stroke="url(#hero-link)" strokeWidth="1.2" />

        <line x1="230" y1="230" x2="230" y2="98" className="stroke-white/30" strokeWidth="1" />
        <line x1="230" y1="230" x2="122" y2="312" className="stroke-white/30" strokeWidth="1" />
        <line x1="230" y1="230" x2="338" y2="312" className="stroke-white/30" strokeWidth="1" />

        <g className="intelligence-glow">
          <circle cx="230" cy="230" r="36" className="fill-accent/10 stroke-accent/35" />
          <circle cx="230" cy="230" r="18" className="fill-accent/20" />
          <text x="230" y="236" textAnchor="middle" className="fill-[#D5E6FF] text-[24px] font-semibold">S</text>
        </g>

        {[
          { x: 230, y: 98, label: 'INDIVIDUAL' },
          { x: 122, y: 312, label: 'TEAM' },
          { x: 338, y: 312, label: 'ORGANISATIONAL' },
        ].map((node) => (
          <g key={node.label}>
            <circle cx={node.x} cy={node.y} r="11" className="fill-[#0f1825] stroke-[#C2D7F2]/60 intelligence-node-pulse" strokeWidth="1.2" />
            <circle cx={node.x} cy={node.y} r="3.4" className="fill-[#D9E9FF]" />
            <text
              x={node.x}
              y={node.y < 120 ? node.y - 24 : node.y + 28}
              textAnchor="middle"
              className="fill-[#ABBDD6] text-[10px] tracking-[0.22em]"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
