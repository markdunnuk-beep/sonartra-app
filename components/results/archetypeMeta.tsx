import React from 'react'

import { ARCHETYPE_LABELS } from '@/lib/interpretation/archetypes/archetype-constants'
import type { ArchetypeKey } from '@/lib/interpretation/archetypes/archetype-types'

export type ArchetypeIconRenderer = (props: { className?: string }) => React.JSX.Element

export type ArchetypeMeta = {
  key: ArchetypeKey
  label: string
  definition: string
  renderIcon: ArchetypeIconRenderer
}

function IconFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="none">
      {children}
    </svg>
  )
}

const iconStrokeProps = {
  stroke: 'currentColor',
  strokeWidth: 2.25,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const ARCHETYPE_META: ArchetypeMeta[] = [
  {
    key: 'strategic_operator',
    label: ARCHETYPE_LABELS.strategic_operator,
    definition: 'Directs effort with precision, pace, and strategic control.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <circle cx="32" cy="32" r="16" {...iconStrokeProps} />
        <circle cx="32" cy="32" r="5" {...iconStrokeProps} />
        <path d="M32 10v8M32 46v8M10 32h8M46 32h8" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'growth_catalyst',
    label: ARCHETYPE_LABELS.growth_catalyst,
    definition: 'Accelerates movement through visible energy and expansion.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <path d="M18 40c3-11 11-18 22-20" {...iconStrokeProps} />
        <path d="M24 48c4-7 10-12 18-15" {...iconStrokeProps} />
        <path d="M39 17h10v10" {...iconStrokeProps} />
        <path d="M49 17 36 30" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'execution_anchor',
    label: ARCHETYPE_LABELS.execution_anchor,
    definition: 'Stabilises execution with dependable rhythm and follow-through.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <path d="M22 18h20" {...iconStrokeProps} />
        <path d="M18 28h28" {...iconStrokeProps} />
        <path d="M24 38h16" {...iconStrokeProps} />
        <path d="M32 18v28" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'systems_architect',
    label: ARCHETYPE_LABELS.systems_architect,
    definition: 'Builds reliable structure across interconnected systems.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <rect x="16" y="16" width="10" height="10" rx="2" {...iconStrokeProps} />
        <rect x="38" y="16" width="10" height="10" rx="2" {...iconStrokeProps} />
        <rect x="16" y="38" width="10" height="10" rx="2" {...iconStrokeProps} />
        <rect x="38" y="38" width="10" height="10" rx="2" {...iconStrokeProps} />
        <path d="M26 21h12M21 26v12M43 26v12M26 43h12" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'insight_explorer',
    label: ARCHETYPE_LABELS.insight_explorer,
    definition: 'Explores patterns through evidence, scanning, and insight.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <circle cx="28" cy="28" r="12" {...iconStrokeProps} />
        <path d="M37 37 48 48" {...iconStrokeProps} />
        <path d="M22 28h12M28 22v12" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'momentum_builder',
    label: ARCHETYPE_LABELS.momentum_builder,
    definition: 'Creates forward motion with communication and directional lift.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <path d="M16 38c7-8 16-13 30-14" {...iconStrokeProps} />
        <path d="M30 18h16v16" {...iconStrokeProps} />
        <path d="M46 18 29 35" {...iconStrokeProps} />
        <path d="M18 45h18" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'trusted_integrator',
    label: ARCHETYPE_LABELS.trusted_integrator,
    definition: 'Connects people and moving parts with measured steadiness.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <circle cx="24" cy="32" r="9" {...iconStrokeProps} />
        <circle cx="40" cy="32" r="9" {...iconStrokeProps} />
        <path d="M20 32h24" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'adaptive_pioneer',
    label: ARCHETYPE_LABELS.adaptive_pioneer,
    definition: 'Navigates change with inventive, flexible directional range.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <path d="M18 42c7-2 12-6 16-13" {...iconStrokeProps} />
        <path d="M34 29c3-5 7-8 12-10" {...iconStrokeProps} />
        <path d="M33 29c2 6 6 10 13 14" {...iconStrokeProps} />
        <path d="M46 19h-9v9" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
  {
    key: 'culture_anchor',
    label: ARCHETYPE_LABELS.culture_anchor,
    definition: 'Holds cohesion and trust in place through change.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <circle cx="32" cy="32" r="6" {...iconStrokeProps} />
        <circle cx="32" cy="32" r="17" {...iconStrokeProps} />
        <circle cx="32" cy="15" r="2.5" fill="currentColor" />
        <circle cx="17" cy="40" r="2.5" fill="currentColor" />
        <circle cx="47" cy="40" r="2.5" fill="currentColor" />
      </IconFrame>
    ),
  },
  {
    key: 'balanced_operator',
    label: ARCHETYPE_LABELS.balanced_operator,
    definition: 'Balances competing demands with even, situational judgement.',
    renderIcon: ({ className }) => (
      <IconFrame className={className}>
        <circle cx="32" cy="32" r="17" {...iconStrokeProps} />
        <path d="M32 15v34M15 32h34" {...iconStrokeProps} />
        <circle cx="32" cy="32" r="4" {...iconStrokeProps} />
      </IconFrame>
    ),
  },
]
