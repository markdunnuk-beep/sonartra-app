'use client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const options = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree']

export function AssessmentQuestionCard({ question, onSelect }: { question: string; onSelect: (value: string) => void }) {
  return (
    <Card className="space-y-5">
      <p className="text-lg text-textPrimary">{question}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => <Button key={option} variant="secondary" className="justify-start" onClick={() => onSelect(option)}>{option}</Button>)}
      </div>
    </Card>
  )
}
