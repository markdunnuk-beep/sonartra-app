const ringLabels = [
  { label: 'Individual Intelligence', x: 400, y: 112 },
  { label: 'Team Intelligence', x: 400, y: 76 },
  { label: 'Organisational Intelligence', x: 400, y: 40 },
]

const ringNodes = [
  { x: 400, y: 212, r: 4.5, pulse: 'primary' },
  { x: 400, y: 156, r: 3.2, pulse: 'secondary' },
  { x: 456, y: 212, r: 3.2, pulse: 'secondary' },
  { x: 344, y: 212, r: 2.6, pulse: 'secondary' },
  { x: 400, y: 128, r: 2.4, pulse: 'tertiary' },
  { x: 484, y: 212, r: 2.4, pulse: 'tertiary' },
  { x: 316, y: 212, r: 2.4, pulse: 'tertiary' },
  { x: 400, y: 92, r: 2.6, pulse: 'secondary' },
  { x: 520, y: 212, r: 2.6, pulse: 'secondary' },
  { x: 280, y: 212, r: 2.6, pulse: 'secondary' },
  { x: 400, y: 52, r: 2.2, pulse: 'tertiary' },
  { x: 560, y: 212, r: 2.2, pulse: 'tertiary' },
  { x: 240, y: 212, r: 2.2, pulse: 'tertiary' },
  { x: 513, y: 99, r: 2.2, pulse: 'tertiary' },
  { x: 287, y: 99, r: 2.2, pulse: 'tertiary' },
  { x: 487, y: 125, r: 2.2, pulse: 'tertiary' },
  { x: 313, y: 125, r: 2.2, pulse: 'tertiary' },
]

const tracePaths = [
  'M400 212 L400 92',
  'M400 212 L520 212',
  'M400 212 L280 212',
  'M400 212 L513 99',
  'M400 212 L287 99',
  'M344 212 C326 198 318 170 313 125',
  'M456 212 C474 198 482 170 487 125',
  'M400 156 C430 154 454 142 487 125',
  'M400 156 C370 154 346 142 313 125',
]

const ambientDots = [
  { x: 148, y: 76, delay: 0.2 },
  { x: 196, y: 110, delay: 1.4 },
  { x: 124, y: 198, delay: 0.8 },
  { x: 176, y: 286, delay: 1.8 },
  { x: 266, y: 324, delay: 0.5 },
  { x: 640, y: 72, delay: 1.2 },
  { x: 688, y: 132, delay: 0.4 },
  { x: 664, y: 236, delay: 1.6 },
  { x: 612, y: 306, delay: 0.9 },
  { x: 724, y: 286, delay: 1.9 },
]

function nodeClass(pulse: (typeof ringNodes)[number]['pulse']) {
  switch (pulse) {
    case 'primary':
      return 'fill-[#dceaff] stroke-[#9bc3f2]/60'
    case 'secondary':
      return 'fill-[#bcd4f1]/75 stroke-[#85addb]/40'
    default:
      return 'fill-[#8ea8c7]/55 stroke-[#6f91ba]/30'
  }
}

export function ArchitectureDiagram() {
  return (
    <div className="architecture-diagram-shell relative isolate overflow-hidden rounded-[1.5rem] border border-white/[0.07] bg-[#050c15]/70 p-4 sm:p-5 lg:p-6">
      <div className="architecture-diagram-grid pointer-events-none absolute inset-0 opacity-45" />
      <div className="architecture-diagram-glow absolute inset-x-[16%] top-8 h-36 rounded-full bg-[radial-gradient(circle_at_center,rgba(94,153,225,0.18),transparent_72%)] blur-3xl" />
      <div className="architecture-diagram-vignette absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(90,140,210,0.12),transparent_34%),linear-gradient(180deg,rgba(6,11,18,0.04),rgba(5,10,16,0.52)_76%,rgba(5,10,16,0.76))]" />

      <div className="relative h-[16rem] sm:h-[19rem] lg:h-[22rem]">
        <svg viewBox="0 0 800 360" className="h-full w-full" role="img" aria-label="Concentric radar visualisation showing Sonartra's three intelligence layers">
          <defs>
            <radialGradient id="radar-core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(170, 212, 255, 0.38)" />
              <stop offset="60%" stopColor="rgba(170, 212, 255, 0.08)" />
              <stop offset="100%" stopColor="rgba(170, 212, 255, 0)" />
            </radialGradient>
            <radialGradient id="radar-sweep-falloff" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(145, 204, 255, 0.2)" />
              <stop offset="48%" stopColor="rgba(145, 204, 255, 0.09)" />
              <stop offset="100%" stopColor="rgba(145, 204, 255, 0)" />
            </radialGradient>
            <linearGradient id="radar-trace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(105, 148, 196, 0)" />
              <stop offset="52%" stopColor="rgba(144, 186, 236, 0.28)" />
              <stop offset="100%" stopColor="rgba(105, 148, 196, 0.02)" />
            </linearGradient>
            <linearGradient id="radar-ring-highlight" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(173, 209, 248, 0.18)" />
              <stop offset="100%" stopColor="rgba(104, 144, 190, 0.03)" />
            </linearGradient>
            <filter id="radar-soft-blur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
          </defs>

          <g opacity="0.28">
            {ambientDots.map((dot) => (
              <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="1.8" className="architecture-dot-pulse fill-[#9ab6d8]" style={{ animationDelay: `${dot.delay}s` }} />
            ))}
          </g>

          <g opacity="0.48">
            {tracePaths.map((path) => (
              <path key={path} d={path} fill="none" stroke="url(#radar-trace)" strokeWidth="1.2" strokeLinecap="round" />
            ))}
          </g>

          <g opacity="0.88">
            <circle cx="400" cy="212" r="160" fill="none" stroke="rgba(136, 160, 189, 0.12)" strokeWidth="1.1" />
            <circle cx="400" cy="212" r="120" fill="none" stroke="rgba(136, 160, 189, 0.14)" strokeWidth="1.1" />
            <circle cx="400" cy="212" r="80" fill="none" stroke="rgba(136, 160, 189, 0.18)" strokeWidth="1.1" />
            <circle cx="400" cy="212" r="160" fill="none" stroke="url(#radar-ring-highlight)" strokeWidth="0.8" strokeDasharray="2 10" className="intelligence-rotate-reverse" />
            <circle cx="400" cy="212" r="120" fill="none" stroke="url(#radar-ring-highlight)" strokeWidth="0.9" strokeDasharray="2 8" className="intelligence-rotate" />
            <circle cx="400" cy="212" r="80" fill="none" stroke="url(#radar-ring-highlight)" strokeWidth="1" strokeDasharray="2 7" className="intelligence-rotate-reverse" />
          </g>

          <g className="intelligence-rotate" style={{ transformOrigin: '400px 212px' }} opacity="0.58">
            <path d="M400 212 L560 184 A160 160 0 0 1 532 282 Z" fill="rgba(114, 166, 230, 0.08)" />
            <path d="M400 212 L520 193 A122 122 0 0 1 500 266 Z" fill="rgba(166, 210, 255, 0.08)" />
            <circle cx="400" cy="212" r="160" fill="url(#radar-sweep-falloff)" />
            <line x1="400" y1="212" x2="554" y2="205" stroke="rgba(189, 223, 255, 0.3)" strokeWidth="1.2" />
          </g>

          <g>
            <circle cx="400" cy="212" r="34" fill="url(#radar-core-glow)" className="intelligence-glow" />
            <circle cx="400" cy="212" r="18" className="fill-[#0f1b2b] stroke-[#9dc3ef]/45" strokeWidth="1.3" />
            <circle cx="400" cy="212" r="8.5" className="intelligence-glow fill-[#dcecff] stroke-[#accff7]/55" strokeWidth="0.8" />
            <text x="400" y="247" textAnchor="middle" className="fill-[#d8e6f7] text-[11px] tracking-[0.28em] uppercase">
              Core Signal Engine
            </text>
          </g>

          {ringNodes.map((node, index) => (
            <g key={`${node.x}-${node.y}`}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r * 3.4}
                className="fill-[#97c0f0]/[0.12]"
                filter="url(#radar-soft-blur)"
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                strokeWidth="1"
                className={`${nodeClass(node.pulse)} architecture-node-pulse`}
                style={{ animationDelay: `${index * 0.22}s` }}
              />
            </g>
          ))}

          {ringLabels.map((ring, index) => (
            <g key={ring.label} className="hidden sm:block">
              <rect x="312" y={ring.y - 17} width="176" height="24" rx="12" className="fill-[#0b1320]/78 stroke-white/10 architecture-label-glow" />
              <text
                x={400}
                y={ring.y}
                textAnchor="middle"
                className="fill-[#b5c9e4] text-[10px] font-medium uppercase tracking-[0.24em]"
                style={{ animationDelay: `${index * 1.1}s` }}
              >
                {ring.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
        {ringLabels.map((ring) => (
          <span key={ring.label} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#a9bdd7]">
            {ring.label}
          </span>
        ))}
      </div>
    </div>
  )
}
