'use client'

import { Card } from '@/components/ui/Card'
import { clsx } from 'clsx'

const options = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree']

export function AssessmentQuestionCard({
  question,
  onSelect,
  selected,
}: {
  question: string
  onSelect: (value: string) => void
  selected?: string
}) {
  return (
    <Card className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary/80">Signal capture</p>
        <p className="mt-3 text-xl font-medium tracking-tight text-textPrimary">{question}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            className={clsx(
              'rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              selected === option
                ? 'border-accent/60 bg-accent/10 text-textPrimary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]'
                : 'border-border/80 bg-panel text-textSecondary hover:border-accent/40 hover:text-textPrimary',
            )}
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </Card>
  )
}
