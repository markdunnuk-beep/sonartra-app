'use client'

import { motion } from 'framer-motion'
import { PulseRings } from './PulseRings'
import { BackgroundSignals } from './BackgroundSignals'
import { SonartraMark } from './SonartraMark'

type IntelligenceTriangleProps = {
  reducedMotion?: boolean
  pointerX?: number
  pointerY?: number
}

const nodeData = [
  { id: 'individual', label: 'Individual Intelligence', x: 200, y: 96, textAnchor: 'middle' as const, lx: 200, ly: 68 },
  { id: 'team', label: 'Team Intelligence', x: 110, y: 266, textAnchor: 'end' as const, lx: 88, ly: 286 },
  { id: 'organisational', label: 'Organisational Intelligence', x: 290, y: 266, textAnchor: 'start' as const, lx: 312, ly: 286 },
]

export function IntelligenceTriangle({ reducedMotion = false, pointerX = 0, pointerY = 0 }: IntelligenceTriangleProps) {
  const parallaxStyle = reducedMotion ? undefined : { transform: `translate3d(${pointerX * 6}px, ${pointerY * 6}px, 0)` }

  return (
    <motion.div
      className="relative mx-auto aspect-square w-full max-w-[26rem] md:max-w-[34rem]"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={parallaxStyle}
    >
      <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Sonartra intelligence triangulation map">
        <BackgroundSignals reducedMotion={reducedMotion} />
        <PulseRings reducedMotion={reducedMotion} />

        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.7 }}>
          <line x1="200" y1="210" x2="200" y2="96" stroke="rgba(162,185,209,0.38)" strokeWidth="1.4" />
          <line x1="200" y1="210" x2="110" y2="266" stroke="rgba(162,185,209,0.38)" strokeWidth="1.4" />
          <line x1="200" y1="210" x2="290" y2="266" stroke="rgba(162,185,209,0.38)" strokeWidth="1.4" />
          <line x1="200" y1="96" x2="110" y2="266" stroke="rgba(162,185,209,0.26)" strokeWidth="1.1" />
          <line x1="110" y1="266" x2="290" y2="266" stroke="rgba(162,185,209,0.26)" strokeWidth="1.1" />
          <line x1="290" y1="266" x2="200" y2="96" stroke="rgba(162,185,209,0.26)" strokeWidth="1.1" />
        </motion.g>

        {nodeData.map((node, index) => (
          <motion.g
            key={node.id}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={
              reducedMotion
                ? { opacity: 1, scale: 1 }
                : {
                    opacity: [0.72, 1, 0.72],
                    scale: [0.98, 1.02, 0.98],
                  }
            }
            transition={
              reducedMotion
                ? { delay: 0.8 + index * 0.15, duration: 0.45 }
                : { duration: 4.8, delay: 1.15 + index * 0.35, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
            }
          >
            <circle cx={node.x} cy={node.y} r="10" className="fill-slate-300/10 stroke-slate-200/55" strokeWidth="1" />
            <circle cx={node.x} cy={node.y} r="3.25" className="fill-slate-100/90" />
            <text x={node.lx} y={node.ly} textAnchor={node.textAnchor} className="fill-slate-200/92 text-[11px] tracking-[0.16em] md:text-[10px]">
              {node.label.toUpperCase()}
            </text>
          </motion.g>
        ))}

        <motion.g initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45, duration: 0.6 }}>
          <circle cx="200" cy="210" r="30" className="fill-slate-200/8" />
          <SonartraMark x={172} y={182} />
        </motion.g>
      </svg>
    </motion.div>
  )
}
