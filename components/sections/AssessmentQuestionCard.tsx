'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
          <Button
            key={option}
            variant="secondary"
            className={`justify-start ${selected === option ? 'border-accent/60 bg-accent/10 text-textPrimary' : ''}`}
            onClick={() => onSelect(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </Card>
  )
}
