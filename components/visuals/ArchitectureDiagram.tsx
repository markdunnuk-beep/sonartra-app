const ringLabels = [
  { label: 'Individual Intelligence', x: 400, y: 112, textClass: 'fill-[#c3d7ef]', rectOpacity: 0.88, textSize: '11px' },
  { label: 'Team Intelligence', x: 400, y: 76, textClass: 'fill-[#b2c7e1]', rectOpacity: 0.74, textSize: '10.5px' },
  { label: 'Organisational Intelligence', x: 400, y: 40, textClass: 'fill-[#9fb4cf]', rectOpacity: 0.6, textSize: '10px' },
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
  'M84 150 C162 124 230 126 294 152',
  'M516 152 C582 128 648 126 726 148',
  'M84 234 C174 260 236 260 304 236',
  'M496 236 C562 260 630 262 720 236',
]

const ambientDots = [
  { x: 96, y: 96, delay: 0.3 },
  { x: 148, y: 76, delay: 0.2 },
  { x: 196, y: 110, delay: 1.4 },
  { x: 124, y: 198, delay: 0.8 },
  { x: 176, y: 286, delay: 1.8 },
  { x: 266, y: 324, delay: 0.5 },
  { x: 224, y: 64, delay: 1.1 },
  { x: 58, y: 226, delay: 1.6 },
  { x: 640, y: 72, delay: 1.2 },
  { x: 688, y: 132, delay: 0.4 },
  { x: 664, y: 236, delay: 1.6 },
  { x: 612, y: 306, delay: 0.9 },
  { x: 724, y: 286, delay: 1.9 },
  { x: 746, y: 122, delay: 0.7 },
  { x: 700, y: 74, delay: 1.5 },
  { x: 772, y: 216, delay: 0.6 },
]

const sideNodes = [
  { x: 88, y: 150, r: 2.4 },
  { x: 128, y: 138, r: 1.8 },
  { x: 168, y: 132, r: 1.8 },
  { x: 712, y: 146, r: 2.4 },
  { x: 672, y: 136, r: 1.8 },
  { x: 632, y: 132, r: 1.8 },
  { x: 90, y: 234, r: 2.1 },
  { x: 138, y: 246, r: 1.7 },
  { x: 710, y: 236, r: 2.1 },
  { x: 662, y: 246, r: 1.7 },
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
      <div className="architecture-diagram-glow absolute inset-x-[8%] top-7 h-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(94,153,225,0.2),transparent_72%)] blur-3xl" />
      <div className="architecture-diagram-vignette absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(90,140,210,0.14),transparent_36%),linear-gradient(180deg,rgba(6,11,18,0.04),rgba(5,10,16,0.48)_72%,rgba(5,10,16,0.76))]" />

      <div className="relative h-[18rem] sm:h-[21rem] lg:h-[24rem]">
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

          <g opacity="0.22">
            <path d="M40 126 C138 92 246 92 326 138" fill="none" stroke="rgba(136, 177, 225, 0.12)" strokeWidth="1.1" strokeDasharray="3 9" />
            <path d="M760 126 C662 92 554 92 474 138" fill="none" stroke="rgba(136, 177, 225, 0.12)" strokeWidth="1.1" strokeDasharray="3 9" />
            <path d="M52 258 C152 290 252 286 330 244" fill="none" stroke="rgba(136, 177, 225, 0.09)" strokeWidth="1" strokeDasharray="3 10" />
            <path d="M748 258 C648 290 548 286 470 244" fill="none" stroke="rgba(136, 177, 225, 0.09)" strokeWidth="1" strokeDasharray="3 10" />
          </g>

          <g opacity="0.28">
            {ambientDots.map((dot) => (
              <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r="1.8" className="architecture-dot-pulse fill-[#9ab6d8]" style={{ animationDelay: `${dot.delay}s` }} />
            ))}
          </g>

          <g opacity="0.34">
            {sideNodes.map((node, index) => (
              <circle key={`${node.x}-${node.y}`} cx={node.x} cy={node.y} r={node.r} className="architecture-node-pulse fill-[#9ec0e6]/65 stroke-[#83a9d5]/35" strokeWidth="0.9" style={{ animationDelay: `${index * 0.18}s` }} />
            ))}
          </g>

          <g opacity="0.48">
            {tracePaths.map((path) => (
              <path key={path} d={path} fill="none" stroke="url(#radar-trace)" strokeWidth="1.2" strokeLinecap="round" />
            ))}
          </g>

          <g opacity="0.88">
            <circle cx="400" cy="212" r="172" fill="none" stroke="rgba(136, 160, 189, 0.11)" strokeWidth="1.05" />
            <circle cx="400" cy="212" r="128" fill="none" stroke="rgba(136, 160, 189, 0.14)" strokeWidth="1.1" />
            <circle cx="400" cy="212" r="84" fill="none" stroke="rgba(136, 160, 189, 0.18)" strokeWidth="1.1" />
            <circle cx="400" cy="212" r="172" fill="none" stroke="url(#radar-ring-highlight)" strokeWidth="0.8" strokeDasharray="2 10" className="intelligence-rotate-reverse" />
            <circle cx="400" cy="212" r="128" fill="none" stroke="url(#radar-ring-highlight)" strokeWidth="0.9" strokeDasharray="2 8" className="intelligence-rotate" />
            <circle cx="400" cy="212" r="84" fill="none" stroke="url(#radar-ring-highlight)" strokeWidth="1" strokeDasharray="2 7" className="intelligence-rotate-reverse" />
          </g>

          <g className="intelligence-rotate" style={{ transformOrigin: '400px 212px' }} opacity="0.58">
            <path d="M400 212 L572 180 A172 172 0 0 1 538 296 Z" fill="rgba(114, 166, 230, 0.08)" />
            <path d="M400 212 L526 191 A128 128 0 0 1 506 274 Z" fill="rgba(166, 210, 255, 0.08)" />
            <circle cx="400" cy="212" r="172" fill="url(#radar-sweep-falloff)" />
            <line x1="400" y1="212" x2="566" y2="204" stroke="rgba(189, 223, 255, 0.3)" strokeWidth="1.2" />
          </g>

          <g>
            <circle cx="400" cy="212" r="46" fill="url(#radar-core-glow)" className="intelligence-glow" />
            <circle cx="400" cy="212" r="24" className="fill-[#0f1b2b] stroke-[#a8cdf7]/55" strokeWidth="1.4" />
            <circle cx="400" cy="212" r="11.5" className="intelligence-glow fill-[#e6f2ff] stroke-[#c0dcfb]/65" strokeWidth="0.9" />
            <circle cx="400" cy="212" r="3.2" className="fill-[#d9edff]" />
            <text x="400" y="252" textAnchor="middle" className="fill-[#dce9f8] text-[11px] tracking-[0.28em] uppercase">
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
              <rect x="312" y={ring.y - 17} width="176" height="24" rx="12" className="fill-[#0b1320]/78 stroke-white/10 architecture-label-glow" style={{ animationDelay: `${index * 1.1}s`, opacity: ring.rectOpacity }} />
              <text
                x={400}
                y={ring.y}
                textAnchor="middle"
                className={`${ring.textClass} font-medium uppercase tracking-[0.24em]`}
                style={{ fontSize: ring.textSize }}
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
