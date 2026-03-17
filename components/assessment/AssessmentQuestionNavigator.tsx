import { clsx } from 'clsx'
import { NavigatorQuestionItem } from '@/lib/assessment-session'

type AssessmentQuestionNavigatorProps = {
  items: NavigatorQuestionItem[]
  answeredCount: number
  unansweredCount: number
  onNavigate: (index: number) => void
}

export function AssessmentQuestionNavigator({
  items,
  answeredCount,
  unansweredCount,
  onNavigate,
}: AssessmentQuestionNavigatorProps) {
  return (
    <div className="surface space-y-3 rounded-xl border-border/70 bg-bg/45 p-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-textSecondary/80">Question Navigator</p>
        <p className="text-xs text-textSecondary">{answeredCount} answered • {unansweredCount} unanswered</p>
      </div>

      <div className="grid grid-cols-5 gap-2" aria-label="Question navigation grid">
        {items.map((item) => (
          <button
            key={item.questionNumber}
            type="button"
            onClick={() => onNavigate(item.index)}
            className={clsx(
              'rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors',
              item.state === 'current' && 'border-accent bg-accent/20 text-accent',
              item.state === 'answered' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15',
              item.state === 'unanswered' && 'border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20',
            )}
            aria-label={`Go to question ${item.questionNumber}`}
            data-state={item.state}
          >
            {item.questionNumber}
          </button>
        ))}
      </div>

      <div className="space-y-1.5 text-[11px] text-textSecondary/85">
        <p><span className="font-semibold text-emerald-200">Answered</span> • completed response</p>
        <p><span className="font-semibold text-amber-200">Unanswered</span> • requires response before submit</p>
        <p><span className="font-semibold text-accent">Current</span> • active prompt</p>
      </div>
    </div>
  )
}
