'use client'

import { AssessmentFlowTransition } from '@/components/assessment/AssessmentFlowTransition'
import { AssessmentProgress, AssessmentProgressRail } from '@/components/assessment/AssessmentProgress'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { AssessmentQuestionCard } from '@/components/sections/AssessmentQuestionCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { assessmentQuestions } from '@/data/mockData'
import { useMemo, useState } from 'react'

export default function AssessmentPage() {
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const completed = index >= assessmentQuestions.length
  const answeredCount = Object.keys(answers).length
  const progress = useMemo(() => Math.round((answeredCount / assessmentQuestions.length) * 100), [answeredCount])

  const onAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }))
    if (index < assessmentQuestions.length) setIndex((i) => i + 1)
  }

  return (
    <AppShell>
      <div className="space-y-7 lg:space-y-9">
        <TopHeader title="Sonartra Signals Assessment" subtitle="Behavioural signal capture" />

        {!started ? (
          <AssessmentShell>
            <Card className="space-y-5 border-border/70 bg-bg/35">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Readiness</p>
              <h2 className="text-2xl font-semibold">Begin your signal capture session</h2>
              <p className="text-sm leading-6 text-textSecondary">
                80 questions • approximately 10–12 minutes • structured behavioural output.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => setStarted(true)}>Begin Assessment</Button>
                <Button variant="secondary" href="/dashboard">
                  Return to Dashboard
                </Button>
              </div>
            </Card>
          </AssessmentShell>
        ) : completed ? (
          <AssessmentShell>
            <Card className="space-y-4 border-accent/40 bg-bg/30">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Complete</p>
              <h2 className="text-2xl font-semibold">Assessment complete</h2>
              <p className="text-sm leading-6 text-textSecondary">
                Signal profile generated successfully. Review your structured report.
              </p>
              <Button href="/results/individual">View Results</Button>
            </Card>
          </AssessmentShell>
        ) : (
          <AssessmentShell
            header={
              <AssessmentProgress
                current={index}
                total={assessmentQuestions.length}
                answered={answeredCount}
                sectionLabel="Signals Session"
              />
            }
            aside={<AssessmentProgressRail current={index} total={assessmentQuestions.length} />}
            footer={
              <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 pt-5">
                <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))}>
                  Back
                </Button>
                <Button onClick={() => setIndex((i) => Math.min(assessmentQuestions.length, i + 1))}>Next</Button>
                <p className="ml-auto text-xs uppercase tracking-[0.14em] text-textSecondary">{progress}% complete</p>
              </div>
            }
          >
            <AssessmentFlowTransition transitionKey={index}>
              <AssessmentQuestionCard question={assessmentQuestions[index]} onSelect={onAnswer} selected={answers[index]} />
            </AssessmentFlowTransition>
          </AssessmentShell>
        )}
      </div>
    </AppShell>
  )
}
