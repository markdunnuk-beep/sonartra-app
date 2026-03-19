import React from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AssessmentRepositoryItem } from '@/lib/assessment/assessment-repository-types'

export function RetakeAssessmentModal({
  item,
  onClose,
}: {
  item: AssessmentRepositoryItem | null
  onClose: () => void
}) {
  if (!item) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#020611]/80 px-4 py-6 backdrop-blur-sm sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-labelledby="retake-assessment-title">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <Card className="relative z-10 w-full max-w-xl border-white/[0.1] bg-[#0A1220]/95 px-6 py-6 sm:px-7 sm:py-7">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/85">Assessment snapshot</p>
            <h2 id="retake-assessment-title" className="text-2xl font-semibold tracking-tight text-textPrimary">
              Retake assessment?
            </h2>
          </div>

          <p className="text-sm leading-7 text-textSecondary">
            Starting this assessment again will create a new results snapshot. Your existing completed results will remain available as a previous snapshot, but the new submission will become the latest version.
          </p>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-textSecondary">
            Retake target: <span className="font-medium text-textPrimary">{item.title}</span>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} className="justify-center px-5">
              Cancel
            </Button>
            <Button href={item.assessmentHref} className="justify-center px-5">
              Start New Snapshot
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
