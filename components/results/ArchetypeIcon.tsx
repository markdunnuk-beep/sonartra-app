import React from 'react'

import { clsx } from 'clsx'

import type { ArchetypeMeta } from '@/components/results/archetypeMeta'

export type ArchetypeDisplayState = 'primary' | 'secondary' | 'inactive'

const STATE_CLASSES: Record<ArchetypeDisplayState, { container: string; ring: string; icon: string; label: string }> = {
  primary: {
    container:
      'border-emerald-300/50 bg-emerald-400/[0.065] shadow-[0_0_0_1px_rgba(167,243,208,0.14),0_0_34px_rgba(16,185,129,0.14)] scale-[1.05]',
    ring: 'border-emerald-300/70 bg-emerald-300/[0.09] text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
    icon: 'text-emerald-50',
    label: 'text-textPrimary',
  },
  secondary: {
    container:
      'border-emerald-500/20 bg-emerald-500/[0.024] shadow-[0_0_0_1px_rgba(74,222,128,0.045),0_0_22px_rgba(16,185,129,0.045)] scale-[1.005]',
    ring: 'border-emerald-500/34 bg-emerald-500/[0.03] text-emerald-100/84',
    icon: 'text-emerald-100/84',
    label: 'text-textPrimary/88',
  },
  inactive: {
    container: 'border-white/[0.045] bg-white/[0.01] opacity-[0.72]',
    ring: 'border-amber-400/10 bg-amber-300/[0.012] text-amber-100/52',
    icon: 'text-amber-100/48',
    label: 'text-textPrimary/70',
  },
}

export function ArchetypeIcon({ archetype, state }: { archetype: ArchetypeMeta; state: ArchetypeDisplayState }) {
  const styles = STATE_CLASSES[state]

  return (
    <li
      className={clsx(
        'min-h-[134px] rounded-[1.55rem] border px-5 py-5 transition-[transform,border-color,background-color,opacity,box-shadow] duration-200 sm:min-h-[140px] sm:px-6 sm:py-6',
        styles.container,
      )}
      data-archetype-key={archetype.key}
      data-archetype-state={state}
      aria-label={`${archetype.label} (${state})`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center sm:gap-3.5">
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
        <p className={clsx('max-w-[11ch] text-sm font-semibold leading-5 tracking-tight sm:text-[15px]', styles.label)}>{archetype.label}</p>
      </div>
    </li>
  )
}
