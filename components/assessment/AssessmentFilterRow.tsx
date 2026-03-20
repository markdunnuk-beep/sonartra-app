import React from 'react'

import { clsx } from 'clsx'

import { getAssessmentFilterGroups } from '@/lib/assessment/assessment-repository-selectors'
import type { AssessmentRepositoryFilterState } from '@/lib/assessment/assessment-repository-types'

export function AssessmentFilterRow({
  activeFilters,
  onFilterChange,
}: {
  activeFilters: AssessmentRepositoryFilterState
  onFilterChange: (filters: AssessmentRepositoryFilterState) => void
}) {
  const [scopeGroup, progressGroup] = getAssessmentFilterGroups()

  return (
    <section aria-label="Assessment filters" className="space-y-4">
      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        {[scopeGroup, progressGroup].map((group) => (
          <div key={group.key} className="rounded-2xl border border-border/60 bg-panel/45 px-4 py-4 sm:px-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/80">{group.label}</p>
              <p className="text-sm leading-6 text-textSecondary/76">{group.description}</p>
            </div>

            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {group.options.map((filter) => {
                const active = activeFilters[group.key] === filter.value

                return (
                  <button
                    key={`${group.key}-${filter.value}`}
                    type="button"
                    onClick={() => onFilterChange({ ...activeFilters, [group.key]: filter.value })}
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
          </div>
        ))}
      </div>
    </section>
  )
}
