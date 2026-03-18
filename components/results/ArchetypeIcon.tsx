import React from 'react'

import { clsx } from 'clsx'

import type { ArchetypeMeta } from '@/components/results/archetypeMeta'

export type ArchetypeDisplayState = 'primary' | 'secondary' | 'inactive'

const STATE_CLASSES: Record<ArchetypeDisplayState, { container: string; ring: string; icon: string; label: string; definition: string }> = {
  primary: {
    container:
      'border-emerald-300/55 bg-emerald-400/[0.08] shadow-[0_0_0_1px_rgba(167,243,208,0.22),0_0_36px_rgba(16,185,129,0.2)] scale-[1.01]',
    ring: 'border-emerald-300/70 bg-emerald-300/[0.08] text-emerald-100',
    icon: 'text-emerald-100',
    label: 'text-textPrimary',
    definition: 'text-emerald-50/80',
  },
  secondary: {
    container:
      'border-emerald-500/30 bg-emerald-500/[0.05] shadow-[0_0_0_1px_rgba(74,222,128,0.08),0_0_24px_rgba(16,185,129,0.1)]',
    ring: 'border-emerald-500/45 bg-emerald-500/[0.05] text-emerald-100/90',
    icon: 'text-emerald-100/90',
    label: 'text-textPrimary/92',
    definition: 'text-textSecondary',
  },
  inactive: {
    container: 'border-amber-500/[0.14] bg-amber-400/[0.03] opacity-[0.88]',
    ring: 'border-amber-400/25 bg-amber-300/[0.03] text-amber-100/78',
    icon: 'text-amber-100/70',
    label: 'text-textPrimary/78',
    definition: 'text-textSecondary/80',
  },
}

export function ArchetypeIcon({ archetype, state }: { archetype: ArchetypeMeta; state: ArchetypeDisplayState }) {
  const styles = STATE_CLASSES[state]

  return (
    <li
      className={clsx(
        'group rounded-3xl border px-4 py-4 transition-transform duration-200 sm:px-5',
        styles.container,
      )}
      data-archetype-key={archetype.key}
      data-archetype-state={state}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div
            className={clsx(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
              state === 'primary' ? 'border-2' : 'border',
              styles.ring,
            )}
            aria-hidden="true"
          >
            {archetype.renderIcon({ className: clsx('h-7 w-7', styles.icon) })}
          </div>
          <span
            className={clsx(
              'rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
              state === 'primary'
                ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-50'
                : state === 'secondary'
                  ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100/85'
                  : 'border-amber-400/20 bg-amber-400/[0.08] text-amber-100/75',
            )}
          >
            {state}
          </span>
        </div>
        <div className="space-y-1.5">
          <p className={clsx('text-sm font-semibold tracking-tight', styles.label)}>{archetype.label}</p>
          <p className={clsx('text-xs leading-5', styles.definition)}>{archetype.definition}</p>
        </div>
      </div>
    </li>
  )
}
