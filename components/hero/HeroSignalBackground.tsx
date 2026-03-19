'use client'

import { motion, useReducedMotion } from 'framer-motion'

const SWEEP_DURATION = 18

const nodes = [
  { id: 'individual-core', x: 27, y: 36, r: 2.8, tier: 'primary' },
  { id: 'individual-1', x: 19, y: 30, r: 1.6, tier: 'secondary' },
  { id: 'individual-2', x: 34, y: 27, r: 1.7, tier: 'secondary' },
  { id: 'individual-3', x: 39, y: 40, r: 1.4, tier: 'tertiary' },
  { id: 'individual-4', x: 16, y: 44, r: 1.4, tier: 'tertiary' },
  { id: 'team-core', x: 51, y: 52, r: 3.2, tier: 'primary' },
  { id: 'team-1', x: 43, y: 47, r: 1.7, tier: 'secondary' },
  { id: 'team-2', x: 58, y: 44, r: 1.7, tier: 'secondary' },
  { id: 'team-3', x: 60, y: 58, r: 1.5, tier: 'tertiary' },
  { id: 'team-4', x: 41, y: 60, r: 1.5, tier: 'tertiary' },
  { id: 'organisation-core', x: 76, y: 68, r: 3.3, tier: 'primary' },
  { id: 'organisation-1', x: 67, y: 61, r: 1.6, tier: 'secondary' },
  { id: 'organisation-2', x: 84, y: 60, r: 1.6, tier: 'secondary' },
  { id: 'organisation-3', x: 88, y: 73, r: 1.5, tier: 'tertiary' },
  { id: 'organisation-4', x: 70, y: 77, r: 1.5, tier: 'tertiary' },
]

const vectors = [
  ['individual-core', 'team-core'],
  ['team-core', 'organisation-core'],
  ['individual-core', 'organisation-core'],
  ['individual-1', 'individual-core'],
  ['individual-2', 'individual-core'],
  ['individual-3', 'individual-core'],
  ['individual-4', 'individual-core'],
  ['team-1', 'team-core'],
  ['team-2', 'team-core'],
  ['team-3', 'team-core'],
  ['team-4', 'team-core'],
  ['organisation-1', 'organisation-core'],
  ['organisation-2', 'organisation-core'],
  ['organisation-3', 'organisation-core'],
  ['organisation-4', 'organisation-core'],
  ['individual-2', 'team-2'],
  ['team-4', 'organisation-1'],
]

const labels = [
  { id: 'individual', text: 'Individual Intelligence', x: 16, y: 27.5, width: 26, start: 0.08 },
  { id: 'team', text: 'Team Intelligence', x: 40, y: 61.5, width: 22, start: 0.38 },
  { id: 'organisation', text: 'Organisational Intelligence', x: 62, y: 77, width: 30, start: 0.68 },
]

const fieldDots = Array.from({ length: 54 }, (_, index) => {
  const column = index % 9
  const row = Math.floor(index / 9)

  return {
    id: `field-${index}`,
    x: 9 + column * 10.5 + (row % 2 === 0 ? 0 : 1.6),
    y: 14 + row * 12,
    delay: (index % 6) * 0.45,
  }
})

const nodeLookup = new Map(nodes.map((node) => [node.id, node]))

function tierStyles(tier: (typeof nodes)[number]['tier']) {
  switch (tier) {
    case 'primary':
      return { fill: 'rgba(214, 234, 255, 0.92)', stroke: 'rgba(130, 178, 232, 0.5)', strokeWidth: 0.5 }
    case 'secondary':
      return { fill: 'rgba(187, 211, 237, 0.72)', stroke: 'rgba(105, 148, 197, 0.32)', strokeWidth: 0.35 }
    default:
      return { fill: 'rgba(154, 180, 210, 0.46)', stroke: 'rgba(95, 132, 173, 0.2)', strokeWidth: 0.3 }
  }
}

export function HeroSignalBackground() {
  const reduceMotion = useReducedMotion() ?? false

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[1.75rem] pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(85,141,212,0.16),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(101,118,148,0.14),transparent_26%),linear-gradient(140deg,rgba(5,10,18,0.98),rgba(8,14,24,0.96)_40%,rgba(4,8,14,0.98))]" />
      <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(130,151,178,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(130,151,178,0.05)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(circle_at_center,black,transparent_92%)]" />
      <div className="absolute inset-y-0 left-[8%] w-[34rem] max-w-[58%] bg-[radial-gradient(circle_at_center,rgba(78,124,184,0.11),transparent_70%)] blur-3xl" />
      <div className="absolute inset-y-0 left-0 w-[56%] bg-[linear-gradient(90deg,rgba(4,8,14,0.88)_0%,rgba(6,11,18,0.76)_42%,rgba(6,11,18,0.18)_78%,transparent_100%)]" />
      <div className="absolute left-[8%] top-[14%] h-[48%] w-[38%] rounded-full bg-[radial-gradient(circle_at_center,rgba(5,9,15,0.34),rgba(5,9,15,0.08)_58%,transparent_76%)] blur-2xl" />
      <motion.div
        className="absolute -inset-x-[12%] top-[26%] h-[28%] bg-[radial-gradient(ellipse_at_center,rgba(124,160,208,0.08),transparent_68%)]"
        animate={reduceMotion ? undefined : { x: ['-4%', '4%', '-4%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-[0.92]">
        <defs>
          <linearGradient id="signal-vector" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(175, 201, 228, 0.02)" />
            <stop offset="45%" stopColor="rgba(137, 173, 214, 0.2)" />
            <stop offset="100%" stopColor="rgba(106, 144, 190, 0.04)" />
          </linearGradient>
          <linearGradient id="wave-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(113, 149, 191, 0)" />
            <stop offset="35%" stopColor="rgba(113, 149, 191, 0.2)" />
            <stop offset="65%" stopColor="rgba(171, 201, 232, 0.32)" />
            <stop offset="100%" stopColor="rgba(113, 149, 191, 0)" />
          </linearGradient>
          <radialGradient id="node-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(145, 191, 245, 0.18)" />
            <stop offset="100%" stopColor="rgba(145, 191, 245, 0)" />
          </radialGradient>
          <filter id="arc-soften" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="0.16" />
          </filter>
          <radialGradient id="sweep-falloff" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(138, 197, 255, 0.22)" />
            <stop offset="45%" stopColor="rgba(138, 197, 255, 0.12)" />
            <stop offset="100%" stopColor="rgba(138, 197, 255, 0)" />
          </radialGradient>
        </defs>

        <g filter="url(#arc-soften)" opacity="0.76">
          {[18, 30, 42, 54].map((radius) => (
            <circle key={radius} cx="60" cy="54" r={radius} fill="none" stroke="rgba(138, 160, 189, 0.055)" strokeWidth="0.22" />
          ))}
        </g>

        {fieldDots.map((dot) => (
          <motion.circle
            key={dot.id}
            cx={dot.x}
            cy={dot.y}
            r="0.34"
            fill="rgba(164, 187, 214, 0.26)"
            animate={reduceMotion ? undefined : { opacity: [0.16, 0.34, 0.16] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: dot.delay }}
          />
        ))}

        <motion.g
          animate={reduceMotion ? undefined : { x: ['-2%', '3%', '-2%'] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          opacity="0.48"
        >
          <path d="M-4 34 C 12 30, 24 40, 42 36 S 70 24, 104 29" fill="none" stroke="url(#wave-stroke)" strokeWidth="1" />
          <path d="M-6 52 C 14 48, 28 58, 47 54 S 78 40, 104 46" fill="none" stroke="url(#wave-stroke)" strokeWidth="0.8" opacity="0.62" />
          <path d="M-2 69 C 18 64, 32 74, 50 70 S 79 58, 104 62" fill="none" stroke="url(#wave-stroke)" strokeWidth="0.75" opacity="0.48" />
        </motion.g>

        <g opacity="0.58">
          {vectors.map(([fromId, toId]) => {
            const from = nodeLookup.get(fromId)
            const to = nodeLookup.get(toId)

            if (!from || !to) {
              return null
            }

            return <line key={`${fromId}-${toId}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="url(#signal-vector)" strokeWidth="0.42" />
          })}
        </g>

        {nodes.map((node, index) => {
          const styles = tierStyles(node.tier)

          return (
            <g key={node.id}>
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.r * 2.8}
                fill="url(#node-halo)"
                animate={reduceMotion ? undefined : { opacity: [0.06, 0.16, 0.06] }}
                transition={{ duration: 8 + (index % 3), repeat: Infinity, ease: 'easeInOut', delay: index * 0.18 }}
              />
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                {...styles}
                animate={reduceMotion ? undefined : { opacity: [0.42, 0.74, 0.42] }}
                transition={{ duration: 6 + (index % 4), repeat: Infinity, ease: 'easeInOut', delay: index * 0.14 }}
              />
            </g>
          )
        })}

        <motion.g
          style={{ transformOrigin: '60% 54%' }}
          animate={reduceMotion ? undefined : { rotate: [0, 360] }}
          transition={{ duration: SWEEP_DURATION, repeat: Infinity, ease: 'linear' }}
          opacity={reduceMotion ? 0.18 : 0.46}
        >
          <path d="M60 54 L100 42 A44 44 0 0 1 97 71 Z" fill="rgba(132, 178, 233, 0.065)" />
          <path d="M60 54 L101 49 A41 41 0 0 1 99 63 Z" fill="rgba(177, 214, 255, 0.075)" />
          <circle cx="60" cy="54" r="45" fill="url(#sweep-falloff)" />
          <line x1="60" y1="54" x2="99" y2="57" stroke="rgba(183, 217, 255, 0.24)" strokeWidth="0.45" />
        </motion.g>
      </svg>

      {labels.map((label) => (
        <motion.div
          key={label.id}
          className="absolute hidden rounded-full border border-white/[0.07] bg-[#0b1320]/68 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-[#adc1dc] shadow-[0_12px_30px_-24px_rgba(0,0,0,0.95)] backdrop-blur-sm sm:block"
          style={{ left: `${label.x}%`, top: `${label.y}%`, width: `${label.width}%` }}
          initial={false}
          animate={
            reduceMotion
              ? { opacity: 0.22 }
              : { opacity: [0.1, 0.1, 0.75, 0.16, 0.1], scale: [0.985, 0.985, 1, 0.992, 0.985] }
          }
          transition={{
            duration: SWEEP_DURATION,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, Math.max(label.start - 0.05, 0), label.start, Math.min(label.start + 0.09, 0.98), 1],
          }}
        >
          {label.text}
        </motion.div>
      ))}

      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#050912] via-[#050912]/78 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[28%] bg-gradient-to-l from-[#050912]/70 via-transparent to-transparent" />
    </div>
  )
}
