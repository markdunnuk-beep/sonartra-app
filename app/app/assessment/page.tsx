'use client'

import { TopHeader } from '@/components/layout/TopHeader'
import { AssessmentQuestionCard } from '@/components/sections/AssessmentQuestionCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { assessmentQuestions } from '@/data/mockData'
import { useMemo, useState } from 'react'

export default function AssessmentPage() {
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})

  const completed = index >= assessmentQuestions.length
  const progress = useMemo(
    () => Math.round((Object.keys(answers).length / assessmentQuestions.length) * 100),
    [answers],
  )

  const onAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }))
    if (index < assessmentQuestions.length) setIndex((i) => i + 1)
  }

  return (
    <div>
      <TopHeader title="Sonartra Signals Assessment" subtitle="Behavioural signal capture" />

      {!started ? (
        <Card className="panel-hover max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">Start Assessment</h2>
          <p className="text-sm leading-relaxed text-textSecondary">80 questions • approximately 10–12 minutes • structured behavioural output across style, leadership, conflict, culture, and stress domains.</p>
          <Button onClick={() => setStarted(true)}>Begin Assessment</Button>
        </Card>
      ) : completed ? (
        <Card className="panel-hover max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">Assessment complete</h2>
          <p className="text-sm text-textSecondary">Signal profile generated successfully. Review your structured report.</p>
          <Button href="/app/results/individual">View Results</Button>
        </Card>
      ) : (
        <div className="max-w-4xl space-y-4">
          <div className="flex items-center justify-between text-sm text-textSecondary">
            <p>Question {index + 1} of {assessmentQuestions.length}</p>
            <p>{progress}% complete</p>
          </div>
          <ProgressBar value={progress} />
          <AssessmentQuestionCard question={assessmentQuestions[index]} onSelect={onAnswer} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))}>Back</Button>
            <Button onClick={() => setIndex((i) => Math.min(assessmentQuestions.length, i + 1))}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
