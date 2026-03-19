import React from 'react'

import { clsx } from 'clsx'

import { formatStatusLabel } from '@/lib/assessment/assessment-repository-selectors'
import type { AssessmentRepositoryStatus } from '@/lib/assessment/assessment-repository-types'

const statusClasses: Record<AssessmentRepositoryStatus, string> = {
  not_started: 'border-white/[0.1] bg-white/[0.03] text-[#D6E0EE]',
  in_progress: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
  complete: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
  coming_soon: 'border-amber-400/20 bg-amber-500/10 text-amber-100',
}

export function AssessmentStatusBadge({ status }: { status: AssessmentRepositoryStatus }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]', statusClasses[status])}>
      {formatStatusLabel(status)}
    </span>
  )
}
