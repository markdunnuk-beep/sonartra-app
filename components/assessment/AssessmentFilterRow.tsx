import React from 'react'

import { clsx } from 'clsx'

import type { AssessmentRepositoryFilter } from '@/lib/assessment/assessment-repository-types'

const FILTER_OPTIONS: Array<{ value: AssessmentRepositoryFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'individual', label: 'Individual' },
  { value: 'team', label: 'Team' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

export function AssessmentFilterRow({ activeFilter, onFilterChange }: { activeFilter: AssessmentRepositoryFilter; onFilterChange: (filter: AssessmentRepositoryFilter) => void }) {
  return (
    <section aria-label="Assessment filters" className="space-y-3">
      <div className="flex flex-wrap gap-2.5">
        {FILTER_OPTIONS.map((filter) => {
          const active = filter.value === activeFilter

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              className={clsx(
                'interaction-control rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                active
                  ? 'border-accent/30 bg-white/[0.065] text-textPrimary shadow-[0_16px_28px_-24px_rgba(76,159,255,0.55)]'
                  : 'border-border/80 bg-panel/65 text-textSecondary hover:border-white/[0.14] hover:bg-panel/85 hover:text-textPrimary',
              )}
            >
              {filter.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
