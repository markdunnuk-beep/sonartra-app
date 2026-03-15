import { ProgressBar } from '@/components/ui/ProgressBar'

export function AssessmentProgress({
  current,
  total,
  answered,
  sectionLabel = 'Signals Assessment',
}: {
  current: number
  total: number
  answered: number
  sectionLabel?: string
}) {
  const progressValue = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textSecondary/80">{sectionLabel}</p>
          <p className="text-sm font-medium text-textPrimary">
            Question {Math.min(current + 1, total)} of {total}
          </p>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-textSecondary">{progressValue}% complete</p>
      </div>
      <ProgressBar value={progressValue} />
    </div>
  )
}

export function AssessmentProgressRail({ current, total }: { current: number; total: number }) {
  const visibleCurrent = Math.min(current + 1, total)

  return (
    <div className="surface space-y-3 rounded-xl border-border/70 bg-bg/45 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textSecondary/80">Session State</p>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{visibleCurrent}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">of {total} prompts</p>
      </div>
      <p className="text-xs leading-5 text-textSecondary">Answer at your pace. Your progress is continuously saved for this active session.</p>
    </div>
  )
}
