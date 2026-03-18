import React from 'react'

import { clsx } from 'clsx'

import type { ArchetypeMeta } from '@/components/results/archetypeMeta'

export type ArchetypeDisplayState = 'primary' | 'secondary' | 'inactive'

const STATE_CLASSES: Record<ArchetypeDisplayState, { container: string; ring: string; icon: string; label: string }> = {
  primary: {
    container:
      'border-emerald-300/42 bg-emerald-400/[0.055] shadow-[0_0_0_1px_rgba(167,243,208,0.12),0_0_36px_rgba(16,185,129,0.14)] scale-[1.025]',
    ring: 'border-emerald-300/65 bg-emerald-300/[0.08] text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.14)]',
    icon: 'text-emerald-50',
    label: 'text-textPrimary',
  },
  secondary: {
    container:
      'border-emerald-500/22 bg-emerald-500/[0.028] shadow-[0_0_0_1px_rgba(74,222,128,0.05),0_0_24px_rgba(16,185,129,0.05)] scale-[1.005]',
    ring: 'border-emerald-500/38 bg-emerald-500/[0.035] text-emerald-100/88',
    icon: 'text-emerald-100/88',
    label: 'text-textPrimary/88',
  },
  inactive: {
    container: 'border-white/[0.06] bg-white/[0.015] opacity-[0.76]',
    ring: 'border-amber-400/14 bg-amber-300/[0.02] text-amber-100/62',
    icon: 'text-amber-100/58',
    label: 'text-textPrimary/74',
  },
}

export function ArchetypeIcon({ archetype, state }: { archetype: ArchetypeMeta; state: ArchetypeDisplayState }) {
  const styles = STATE_CLASSES[state]

  return (
    <li
      className={clsx(
        'rounded-[1.55rem] border px-5 py-5 transition-transform duration-200 sm:px-6 sm:py-6',
        'min-h-[134px] lg:min-h-[140px]',
        styles.container,
      )}
      data-archetype-key={archetype.key}
      data-archetype-state={state}
      aria-label={`${archetype.label} (${state})`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-3.5 text-center sm:gap-4">
        <div
          className={clsx(
            'flex h-[3.85rem] w-[3.85rem] items-center justify-center rounded-full border transition-colors duration-200 sm:h-[4.15rem] sm:w-[4.15rem]',
            state === 'primary' ? 'border-[1.5px]' : 'border',
            styles.ring,
          )}
          aria-hidden="true"
        >
          {archetype.renderIcon({ className: clsx('h-7 w-7 sm:h-8 sm:w-8', styles.icon) })}
        </div>
        <p className={clsx('max-w-[11ch] text-sm font-semibold tracking-tight leading-5 sm:text-[15px]', styles.label)}>{archetype.label}</p>
      </div>
    </li>
  )
}
