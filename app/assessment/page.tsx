'use client'

import { AssessmentFlowTransition } from '@/components/assessment/AssessmentFlowTransition'
import { AssessmentProgress, AssessmentProgressRail } from '@/components/assessment/AssessmentProgress'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { AssessmentQuestionCard, type AssessmentQuestionOption } from '@/components/sections/AssessmentQuestionCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useEffect, useMemo, useRef, useState } from 'react'

const AUTO_ADVANCE_DELAY_MS = 400
const ACTIVE_ASSESSMENT_STORAGE_KEY = 'sonartra_active_assessment_id'
// Temporary development-only user id until authentication is implemented.
const TEMP_DEVELOPMENT_USER_ID = '4a947577-7766-46b4-a9ef-163f39ede7ca'
const ASSESSMENT_VERSION_KEY = 'wplp80-v1'

interface LiveQuestion {
  questionNumber: number
  prompt: string
  options: AssessmentQuestionOption[]
}

interface AssessmentQuestionsResponse {
  assessment: {
    id: string
    status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'
    progressCount: number
    progressPercent: number
    currentQuestionIndex: number
  }
  questions: Array<{
    question_number: number
    prompt: string
    options: Array<{
      option_text: string
      numeric_value: number | null
      display_order: number
    }>
  }>
  responses: Array<{
    question_id: number
    response_value: number
  }>
}

function normalizeQuestions(response: AssessmentQuestionsResponse): LiveQuestion[] {
  return response.questions.map((question) => ({
    questionNumber: question.question_number,
    prompt: question.prompt,
    options: question.options.map((option, index) => ({
      label: option.option_text,
      value: String(option.numeric_value ?? index + 1),
    })),
  }))
}

export default function AssessmentPage() {
  const [started, setStarted] = useState(false)
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<LiveQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const questionShownAtRef = useRef<number>(Date.now())

  const totalQuestions = questions.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions
  const currentQuestion = questions[index]
  const selectedValue = currentQuestion ? String(answers[currentQuestion.questionNumber] ?? '') : undefined
  const progress = useMemo(() => {
    if (!totalQuestions) return 0
    return Math.round((answeredCount / totalQuestions) * 100)
  }, [answeredCount, totalQuestions])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) {
        clearTimeout(advanceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    questionShownAtRef.current = Date.now()
  }, [index, currentQuestion?.questionNumber])

  const clearAdvanceTimer = () => {
    if (!advanceTimerRef.current) return
    clearTimeout(advanceTimerRef.current)
    advanceTimerRef.current = null
  }

  const hydrateAssessment = (data: AssessmentQuestionsResponse) => {
    const mappedQuestions = normalizeQuestions(data)
    const restoredAnswers = data.responses.reduce<Record<number, number>>((acc, response) => {
      acc[response.question_id] = response.response_value
      return acc
    }, {})

    const nextIndex = mappedQuestions.findIndex((question) => restoredAnswers[question.questionNumber] === undefined)
    const initialIndex = nextIndex === -1 ? Math.max(mappedQuestions.length - 1, 0) : nextIndex

    setQuestions(mappedQuestions)
    setAnswers(restoredAnswers)
    setIndex(initialIndex)
    setStarted(true)
    setCompleted(data.assessment.status === 'completed')
  }

  const fetchAssessmentQuestions = async (id: string) => {
    const response = await fetch(`/api/assessments/${id}/questions`)
    const data = (await response.json()) as AssessmentQuestionsResponse | { error: string }

    if (!response.ok || 'error' in data) {
      throw new Error('error' in data ? data.error : 'Unable to load assessment questions.')
    }

    hydrateAssessment(data)
  }

  useEffect(() => {
    const resume = async () => {
      const storedAssessmentId = window.localStorage.getItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
      if (!storedAssessmentId) return

      setLoading(true)
      setError(null)

      try {
        setAssessmentId(storedAssessmentId)
        await fetchAssessmentQuestions(storedAssessmentId)
      } catch (resumeError) {
        console.error(resumeError)
        window.localStorage.removeItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
        setAssessmentId(null)
        setError('Unable to resume your saved assessment. Please start a new attempt.')
      } finally {
        setLoading(false)
      }
    }

    void resume()
  }, [])

  const startAssessment = async () => {
    setLoading(true)
    setError(null)

    try {
      const startResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEMP_DEVELOPMENT_USER_ID,
          assessmentVersionKey: ASSESSMENT_VERSION_KEY,
          source: 'direct',
        }),
      })

      const startData = (await startResponse.json()) as { assessmentId?: string; error?: string }

      if (!startResponse.ok || !startData.assessmentId) {
        throw new Error(startData.error ?? 'Unable to start assessment.')
      }

      setAssessmentId(startData.assessmentId)
      window.localStorage.setItem(ACTIVE_ASSESSMENT_STORAGE_KEY, startData.assessmentId)
      await fetchAssessmentQuestions(startData.assessmentId)
    } catch (startError) {
      console.error(startError)
      setError(startError instanceof Error ? startError.message : 'Unable to start assessment.')
    } finally {
      setLoading(false)
    }
  }

  const goNext = () => {
    clearAdvanceTimer()
    setIndex((i) => Math.min(totalQuestions - 1, i + 1))
  }

  const goBack = () => {
    clearAdvanceTimer()
    setIndex((i) => Math.max(0, i - 1))
  }

  const onAnswer = async (value: string) => {
    if (!assessmentId || !currentQuestion) return

    const responseValue = Number(value)
    if (!Number.isInteger(responseValue)) {
      setError('Invalid response value selected.')
      return
    }

    setSaving(true)
    setError(null)
    clearAdvanceTimer()

    try {
      const responseTimeMs = Math.max(0, Date.now() - questionShownAtRef.current)
      const saveResponse = await fetch('/api/assessments/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessmentId,
          questionId: currentQuestion.questionNumber,
          responseValue,
          responseTimeMs,
        }),
      })

      const saveData = (await saveResponse.json()) as { error?: string }
      if (!saveResponse.ok) {
        throw new Error(saveData.error ?? 'Unable to save assessment response.')
      }

      setAnswers((prev) => ({ ...prev, [currentQuestion.questionNumber]: responseValue }))

      advanceTimerRef.current = setTimeout(() => {
        setIndex((i) => Math.min(totalQuestions - 1, i + 1))
        advanceTimerRef.current = null
      }, AUTO_ADVANCE_DELAY_MS)
    } catch (saveError) {
      console.error(saveError)
      setError(saveError instanceof Error ? saveError.message : 'Unable to save assessment response.')
    } finally {
      setSaving(false)
    }
  }

  const completeAssessment = async () => {
    if (!assessmentId || !allAnswered) return

    setCompleting(true)
    setError(null)

    try {
      const response = await fetch('/api/assessments/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      })

      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? 'Unable to complete assessment.')
      }

      setCompleted(true)
      window.localStorage.removeItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
    } catch (completeError) {
      console.error(completeError)
      setError(completeError instanceof Error ? completeError.message : 'Unable to complete assessment.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-7 lg:space-y-9">
        <TopHeader title="Sonartra Signals Assessment" subtitle="Behavioural signal capture" />

        {!started ? (
          <AssessmentShell className="max-w-[70rem] p-5 sm:p-8 lg:p-10">
            <Card className="mx-auto w-full max-w-3xl space-y-8 border-border/75 bg-bg/40 px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textSecondary/90">Readiness</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-[2.15rem]">Begin your signal capture session</h2>
              <p className="max-w-2xl text-base leading-7 text-textSecondary">
                80 questions • approximately 10–12 minutes • structured behavioural output.
              </p>
              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
              <div className="flex flex-wrap items-center gap-3.5 pt-1 sm:gap-4">
                <Button onClick={startAssessment} className="min-w-[11rem] px-6" disabled={loading}>
                  {loading ? 'Starting…' : 'Begin Assessment'}
                </Button>
                <Button variant="secondary" href="/dashboard" className="min-w-[11rem] px-6" disabled={loading}>
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
              <p className="text-sm leading-6 text-textSecondary">Assessment completed successfully.</p>
              <Button href="/dashboard">Return to Dashboard</Button>
            </Card>
          </AssessmentShell>
        ) : (
          <AssessmentShell
            header={
              <AssessmentProgress current={index} total={totalQuestions} answered={answeredCount} sectionLabel="Signals Session" />
            }
            aside={<AssessmentProgressRail current={index} total={totalQuestions} />}
            footer={
              <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 pt-5">
                <Button variant="secondary" onClick={goBack} className="active:translate-y-[1px]" disabled={index === 0 || loading}>
                  Back
                </Button>
                <Button onClick={goNext} className="min-w-[6rem] active:translate-y-[1px]" disabled={index >= totalQuestions - 1 || loading}>
                  Next
                </Button>
                <Button
                  onClick={completeAssessment}
                  disabled={!allAnswered || completing}
                  className="min-w-[10rem] active:translate-y-[1px]"
                >
                  {completing ? 'Completing…' : 'Complete Assessment'}
                </Button>
                <p className="ml-auto rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs uppercase tracking-[0.14em] text-textSecondary">
                  {progress}% complete
                </p>
              </div>
            }
          >
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <AssessmentFlowTransition transitionKey={index}>
              {currentQuestion ? (
                <AssessmentQuestionCard
                  question={currentQuestion.prompt}
                  options={currentQuestion.options}
                  onSelect={onAnswer}
                  selected={selectedValue}
                  disabled={saving || loading}
                />
              ) : (
                <Card className="space-y-3 border-border/70 bg-panel/92">
                  <h2 className="text-xl font-semibold">Loading questions…</h2>
                  <p className="text-sm text-textSecondary">Please wait while we load your assessment.</p>
                </Card>
              )}
            </AssessmentFlowTransition>
          </AssessmentShell>
        )}
      </div>
    </AppShell>
  )
}
