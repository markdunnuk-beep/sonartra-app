'use client'

import { AppShell } from '@/components/layout/AppShell'
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
    <AppShell>
      <div className="space-y-6 lg:space-y-8">
        <TopHeader title="Sonartra Signals Assessment" subtitle="Behavioural signal capture" />

        {!started ? (
          <Card className="max-w-2xl space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Readiness</p>
            <h2 className="text-2xl font-semibold">Start Assessment</h2>
            <p className="text-sm leading-6 text-textSecondary">
              80 questions • approximately 10–12 minutes • structured behavioural output.
            </p>
            <Button onClick={() => setStarted(true)}>Begin</Button>
          </Card>
        ) : completed ? (
          <Card className="max-w-2xl space-y-4 border-accent/40">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Complete</p>
            <h2 className="text-2xl font-semibold">Assessment complete</h2>
            <p className="text-sm leading-6 text-textSecondary">
              Signal profile generated successfully. Review your structured report.
            </p>
            <Button href="/results/individual">View Results</Button>
          </Card>
        ) : (
          <div className="max-w-3xl space-y-5">
            <div className="flex items-center justify-between gap-3 text-sm text-textSecondary">
              <p className="font-medium">
                Question {index + 1} of {assessmentQuestions.length}
              </p>
              <p>{progress}% complete</p>
            </div>
            <ProgressBar value={progress} />
            <div key={index} className="transition-opacity duration-200 ease-out">
              <AssessmentQuestionCard
                question={assessmentQuestions[index]}
                onSelect={onAnswer}
                selected={answers[index]}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                Back
              </Button>
              <Button onClick={() => setIndex((i) => Math.min(assessmentQuestions.length, i + 1))}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
