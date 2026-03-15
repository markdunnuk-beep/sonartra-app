import { ProgressBar } from '@/components/ui/ProgressBar'
import { clsx } from 'clsx'

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
        <p className="rounded-md border border-accent/25 bg-accent/10 px-2.5 py-1 text-xs font-medium uppercase tracking-[0.14em] text-accent">
          {progressValue}% complete
        </p>
      </div>
      <ProgressBar value={progressValue} />
    </div>
  )
}

export function AssessmentProgressRail({ current, total }: { current: number; total: number }) {
  const visibleCurrent = Math.min(current + 1, total)
  const estimatedMinutesRemaining = Math.max(1, Math.ceil(((total - visibleCurrent) * 10) / total))

  return (
    <div className="surface space-y-3 rounded-xl border-border/70 bg-bg/45 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textSecondary/80">Session State</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Active
        </span>
      </div>
      <div>
        <p className="text-lg font-semibold text-textPrimary">{visibleCurrent}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">of {total} prompts</p>
      </div>
      <p className="text-xs leading-5 text-textSecondary">Answer at your pace. Progress is continuously saved for this active session.</p>
      <p className={clsx('text-[11px] uppercase tracking-[0.14em] text-textSecondary/80')}>
        Estimated {estimatedMinutesRemaining} min remaining
      </p>
    </div>
  )
}
