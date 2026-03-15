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
import { useEffect, useMemo, useRef, useState } from 'react'

const AUTO_ADVANCE_DELAY_MS = 400

export default function AssessmentPage() {
  const [started, setStarted] = useState(false)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completed = index >= assessmentQuestions.length
  const answeredCount = Object.keys(answers).length
  const progress = useMemo(() => Math.round((answeredCount / assessmentQuestions.length) * 100), [answeredCount])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  const clearAdvanceTimer = () => {
    if (!advanceTimerRef.current) return
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = null
  }

  const goNext = () => {
    clearAdvanceTimer()
    setIndex((i) => Math.min(assessmentQuestions.length, i + 1))
  }

  const goBack = () => {
    clearAdvanceTimer()
    setIndex((i) => Math.max(0, i - 1))
  }

  const onAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }))
    clearAdvanceTimer()

    if (index >= assessmentQuestions.length) return

    advanceTimerRef.current = setTimeout(() => {
      setIndex((i) => Math.min(assessmentQuestions.length, i + 1))
      advanceTimerRef.current = null
    }, AUTO_ADVANCE_DELAY_MS)
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
                <Button variant="secondary" onClick={goBack} className="active:translate-y-[1px]">
                  Back
                </Button>
                <Button onClick={goNext} className="min-w-[6rem] active:translate-y-[1px]">
                  Next
                </Button>
                <p className="ml-auto rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs uppercase tracking-[0.14em] text-textSecondary">
                  {progress}% complete
                </p>
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
