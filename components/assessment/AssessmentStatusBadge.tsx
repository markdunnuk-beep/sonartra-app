import React from 'react'

import { clsx } from 'clsx'

import { formatStatusLabel } from '@/lib/assessment/assessment-repository-selectors'
import type { AssessmentRepositoryItem, AssessmentRepositoryStatus } from '@/lib/assessment/assessment-repository-types'

const statusClasses: Record<AssessmentRepositoryStatus, string> = {
  not_started: 'border-white/[0.1] bg-white/[0.03] text-[#D6E0EE]',
  in_progress: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
  processing: 'border-violet-400/25 bg-violet-500/10 text-violet-100',
  complete: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
  error: 'border-rose-400/25 bg-rose-500/10 text-rose-100',
  coming_soon: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
}

export function AssessmentStatusBadge({ item }: { item: AssessmentRepositoryItem }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]',
        statusClasses[item.status],
      )}
    >
      {formatStatusLabel(item.status, item.lifecycleState)}
    </span>
  )
}
