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
                  ? 'border-white/[0.14] bg-white/[0.075] text-textPrimary shadow-[0_16px_28px_-24px_rgba(76,159,255,0.38)]'
                  : 'border-border/65 bg-panel/50 text-textSecondary/82 hover:border-white/[0.12] hover:bg-panel/72 hover:text-textPrimary',
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
