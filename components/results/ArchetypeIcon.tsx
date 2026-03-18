import React from 'react'

import { clsx } from 'clsx'

import type { ArchetypeMeta } from '@/components/results/archetypeMeta'

export type ArchetypeDisplayState = 'primary' | 'secondary' | 'inactive'

const STATE_CLASSES: Record<ArchetypeDisplayState, { container: string; ring: string; icon: string; label: string }> = {
  primary: {
    container:
      'border-emerald-300/55 bg-emerald-400/[0.08] shadow-[0_0_0_1px_rgba(167,243,208,0.16),0_0_44px_rgba(16,185,129,0.18)] scale-[1.02]',
    ring: 'border-emerald-300/70 bg-emerald-300/[0.09] text-emerald-50 shadow-[0_0_26px_rgba(16,185,129,0.16)]',
    icon: 'text-emerald-50',
    label: 'text-textPrimary',
  },
  secondary: {
    container:
      'border-emerald-500/30 bg-emerald-500/[0.045] shadow-[0_0_0_1px_rgba(74,222,128,0.08),0_0_30px_rgba(16,185,129,0.08)] scale-[1.005]',
    ring: 'border-emerald-500/45 bg-emerald-500/[0.05] text-emerald-100/90',
    icon: 'text-emerald-100/90',
    label: 'text-textPrimary/90',
  },
  inactive: {
    container: 'border-amber-500/[0.12] bg-amber-400/[0.025] opacity-[0.84]',
    ring: 'border-amber-400/20 bg-amber-300/[0.025] text-amber-100/72',
    icon: 'text-amber-100/68',
    label: 'text-textPrimary/76',
  },
}

export function ArchetypeIcon({ archetype, state }: { archetype: ArchetypeMeta; state: ArchetypeDisplayState }) {
  const styles = STATE_CLASSES[state]

  return (
    <li
      className={clsx(
        'rounded-[1.75rem] border px-5 py-6 transition-transform duration-200 sm:px-6 sm:py-7',
        'min-h-[148px] lg:min-h-[156px]',
        styles.container,
      )}
      data-archetype-key={archetype.key}
      data-archetype-state={state}
      aria-label={`${archetype.label} (${state})`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div
          className={clsx(
            'flex h-16 w-16 items-center justify-center rounded-full border transition-colors duration-200 sm:h-[4.5rem] sm:w-[4.5rem]',
            state === 'primary' ? 'border-[1.5px]' : 'border',
            styles.ring,
          )}
          aria-hidden="true"
        >
          {archetype.renderIcon({ className: clsx('h-8 w-8 sm:h-9 sm:w-9', styles.icon) })}
        </div>
        <p className={clsx('max-w-[12ch] text-sm font-semibold tracking-tight sm:text-[15px]', styles.label)}>{archetype.label}</p>
      </div>
    </li>
  )
}
