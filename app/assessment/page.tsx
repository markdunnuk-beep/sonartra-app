'use client'

import { AssessmentFlowTransition } from '@/components/assessment/AssessmentFlowTransition'
import { AssessmentQuestionNavigator } from '@/components/assessment/AssessmentQuestionNavigator'
import { AssessmentProgress, AssessmentProgressRail } from '@/components/assessment/AssessmentProgress'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { AssessmentQuestionCard, type AssessmentQuestionOption } from '@/components/sections/AssessmentQuestionCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { deriveAssessmentSessionState, getResumeQuestionIndex } from '@/lib/assessment-session'
import { deriveAssessmentEntryPhase } from '@/lib/assessment-entry-state'
import { useEffect, useMemo, useRef, useState } from 'react'

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
  const [viewState, setViewState] = useState<'intro' | 'starting' | 'active'>('intro')
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [questions, setQuestions] = useState<LiveQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [savingCount, setSavingCount] = useState(0)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [reviewMode, setReviewMode] = useState(false)

  const questionShownAtRef = useRef<number>(Date.now())
  const saveSequenceRef = useRef<Record<number, number>>({})
  const pendingSavesRef = useRef<Map<number, Promise<void>>>(new Map())
  const answersRef = useRef<Record<number, number>>({})

  const totalQuestions = questions.length
  const sessionState = useMemo(() => deriveAssessmentSessionState(questions, answers, index), [questions, answers, index])
  const answeredCount = sessionState.answeredCount
  const unansweredCount = sessionState.unansweredCount
  const allAnswered = sessionState.isAssessmentComplete
  const currentQuestion = questions[index]
  const selectedValue = currentQuestion ? String(answers[currentQuestion.questionNumber] ?? '') : undefined
  const progress = useMemo(() => {
    if (!totalQuestions) return 0
    return Math.round((answeredCount / totalQuestions) * 100)
  }, [answeredCount, totalQuestions])
  const isAssessmentHydrated = viewState === 'active' && totalQuestions > 0
  const showSaveStatus = isAssessmentHydrated && !saveWarning
  const saveStatusLabel = savingCount > 0 ? 'Saving…' : 'All changes saved'
  const entryPhase = deriveAssessmentEntryPhase(viewState, startError)

  useEffect(() => {
    if (allAnswered) {
      setReviewMode(false)
    }
  }, [allAnswered])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    questionShownAtRef.current = Date.now()
  }, [index, currentQuestion?.questionNumber])

  const logPerf = (label: string, meta?: Record<string, number | string>) => {
    if (process.env.NODE_ENV === 'production') return
    console.info(`[assessment-perf] ${label}`, meta ?? {})
  }

  const saveResponseInBackground = (questionNumber: number, responseValue: number, responseTimeMs: number) => {
    if (!assessmentId) return

    const sequence = (saveSequenceRef.current[questionNumber] ?? 0) + 1
    saveSequenceRef.current[questionNumber] = sequence
    setSavingCount((count) => count + 1)

    const startedAt = performance.now()

    const savePromise = (async () => {
      try {
        const saveResponse = await fetch('/api/assessments/response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            assessmentId,
            questionId: questionNumber,
            responseValue,
            responseTimeMs,
          }),
        })

        const saveData = (await saveResponse.json()) as { error?: string }
        if (!saveResponse.ok) {
          throw new Error(saveData.error ?? 'Unable to save assessment response.')
        }

        if (saveSequenceRef.current[questionNumber] === sequence) {
          setSaveWarning(null)
        }
      } catch (saveError) {
        console.error(saveError)
        if (saveSequenceRef.current[questionNumber] === sequence && answersRef.current[questionNumber] === responseValue) {
          setSaveWarning('Your latest answer is queued locally. We will retry on your next navigation.')
        }
      } finally {
        logPerf('response-save-duration', {
          questionNumber,
          durationMs: Math.round(performance.now() - startedAt),
        })
        setSavingCount((count) => Math.max(0, count - 1))
      }
    })()

    pendingSavesRef.current.set(questionNumber, savePromise)
    void savePromise.finally(() => {
      if (pendingSavesRef.current.get(questionNumber) === savePromise) {
        pendingSavesRef.current.delete(questionNumber)
      }
    })
  }

  const hydrateAssessment = (data: AssessmentQuestionsResponse) => {
    const mappedQuestions = normalizeQuestions(data)
    const restoredAnswers = data.responses.reduce<Record<number, number>>((acc, response) => {
      acc[response.question_id] = response.response_value
      return acc
    }, {})

    const initialIndex = getResumeQuestionIndex(mappedQuestions, restoredAnswers)

    setQuestions(mappedQuestions)
    setAnswers(restoredAnswers)
    setIndex(initialIndex)
    setViewState('active')
    setCompleted(data.assessment.status === 'completed')
  }

  const fetchAssessmentQuestions = async (id: string, reason: 'resume' | 'start') => {
    const startedAt = performance.now()
    logPerf('question-fetch-start', { reason })
    const response = await fetch(`/api/assessments/${id}/questions`)
    const data = (await response.json()) as AssessmentQuestionsResponse | { error: string }

    if (!response.ok || 'error' in data) {
      console.error('[assessment] question fetch failed', { reason, assessmentId: id, status: response.status, payload: data })
      throw new Error('error' in data ? data.error : 'Unable to load assessment questions.')
    }

    hydrateAssessment(data)
    logPerf('initial-question-load', { durationMs: Math.round(performance.now() - startedAt), questionCount: data.questions.length })
  }

  const startAssessment = async () => {
    setViewState('starting')
    setLoading(true)
    setStartError(null)
    setAssessmentError(null)

    try {
      const storedAssessmentId = window.localStorage.getItem(ACTIVE_ASSESSMENT_STORAGE_KEY)

      if (storedAssessmentId) {
        try {
          setAssessmentId(storedAssessmentId)
          await fetchAssessmentQuestions(storedAssessmentId, 'resume')
          return
        } catch (resumeError) {
          console.error('[assessment] resume failed, falling back to new start', {
            storedAssessmentId,
            error: resumeError,
          })
          window.localStorage.removeItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
          setAssessmentId(null)
        }
      }

      const startResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: TEMP_DEVELOPMENT_USER_ID,
          assessmentVersionKey: ASSESSMENT_VERSION_KEY,
          source: 'direct',
        }),
      })

      const startData = (await startResponse.json().catch(() => null)) as { assessmentId?: string; error?: string } | null

      if (!startResponse.ok || !startData?.assessmentId) {
        console.error('[assessment] start request failed', {
          status: startResponse.status,
          statusText: startResponse.statusText,
          payload: startData,
        })
        throw new Error(startData?.error ?? 'Unable to start assessment.')
      }

      setAssessmentId(startData.assessmentId)
      window.localStorage.setItem(ACTIVE_ASSESSMENT_STORAGE_KEY, startData.assessmentId)
      await fetchAssessmentQuestions(startData.assessmentId, 'start')
    } catch (startFailure) {
      console.error('[assessment] entry flow failed', startFailure)
      setStartError(startFailure instanceof Error ? startFailure.message : 'Unable to start assessment.')
      setViewState('intro')
    } finally {
      setLoading(false)
    }
  }

  const persistCurrentQuestion = () => {
    const activeQuestion = questions[index]
    if (!activeQuestion) return

    const currentAnswer = answers[activeQuestion.questionNumber]
    if (currentAnswer === undefined) return

    const responseTimeMs = Math.max(0, Date.now() - questionShownAtRef.current)
    saveResponseInBackground(activeQuestion.questionNumber, currentAnswer, responseTimeMs)
  }

  const goNext = () => {
    persistCurrentQuestion()

    const transitionStartedAt = performance.now()
    setIndex((i) => Math.min(totalQuestions - 1, i + 1))
    requestAnimationFrame(() => {
      logPerf('question-transition', {
        fromIndex: index,
        toIndex: Math.min(totalQuestions - 1, index + 1),
        durationMs: Math.round(performance.now() - transitionStartedAt),
      })
    })
  }

  const goBack = () => {
    persistCurrentQuestion()
    setIndex((i) => Math.max(0, i - 1))
  }

  const goToQuestion = (nextIndex: number) => {
    persistCurrentQuestion()
    setIndex(Math.max(0, Math.min(totalQuestions - 1, nextIndex)))
  }

  const onAnswer = (value: string) => {
    if (!currentQuestion) return

    const responseValue = Number(value)
    if (!Number.isInteger(responseValue)) {
      setAssessmentError('Invalid response value selected.')
      return
    }

    setAssessmentError(null)
    setAnswers((prev) => ({ ...prev, [currentQuestion.questionNumber]: responseValue }))
  }

  const completeAssessment = async () => {
    if (!assessmentId) return

    if (!allAnswered) {
      setReviewMode(true)
      setAssessmentError(`You still have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}. Complete all questions before submission.`)

      if (sessionState.firstUnansweredIndex !== null) {
        goToQuestion(sessionState.firstUnansweredIndex)
      }

      return
    }

    setCompleting(true)
    setAssessmentError(null)

    try {
      if (pendingSavesRef.current.size > 0) {
        await Promise.allSettled([...pendingSavesRef.current.values()])
      }

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
      setAssessmentError(completeError instanceof Error ? completeError.message : 'Unable to complete assessment.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <AppShell>
      <div className="space-y-7 lg:space-y-9">
        <TopHeader title="Sonartra Signals Assessment" subtitle="Behavioural signal capture" />

        {entryPhase !== 'active' ? (
          <AssessmentShell className="max-w-[70rem] p-5 sm:p-8 lg:p-10">
            <Card className="mx-auto w-full max-w-3xl space-y-8 border-border/75 bg-bg/40 px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textSecondary/90">Readiness</p>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-[2.15rem]">Begin your signal capture session</h2>
              <p className="max-w-2xl text-base leading-7 text-textSecondary">
                80 questions • approximately 10–12 minutes • structured behavioural output.
              </p>
              {startError ? <p className="text-sm text-rose-300">{startError}</p> : null}
              <div className="flex flex-wrap items-center gap-3.5 pt-1 sm:gap-4">
                <Button onClick={startAssessment} className="min-w-[11rem] px-6" disabled={entryPhase === 'starting'}>
                  {entryPhase === 'starting' ? 'Starting…' : 'Begin Assessment'}
                </Button>
                <Button variant="secondary" href="/dashboard" className="min-w-[11rem] px-6" disabled={entryPhase === 'starting'}>
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
            aside={
              <div className="space-y-3">
                <AssessmentProgressRail current={index} total={totalQuestions} />
                <AssessmentQuestionNavigator
                  items={sessionState.navigatorItems}
                  answeredCount={answeredCount}
                  unansweredCount={unansweredCount}
                  onNavigate={goToQuestion}
                />
              </div>
            }
          >
            {assessmentError ? <p className="text-sm text-rose-300">{assessmentError}</p> : null}
            {saveWarning ? <p className="text-sm text-amber-300">{saveWarning}</p> : null}
            {reviewMode && unansweredCount > 0 ? (
              <Card className="space-y-3 border-amber-400/30 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Review mode</p>
                <p className="text-sm text-amber-100">
                  Review mode: {unansweredCount} unanswered question{unansweredCount === 1 ? '' : 's'} remaining.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => {
                      if (sessionState.firstUnansweredIndex !== null) {
                        goToQuestion(sessionState.firstUnansweredIndex)
                      }
                    }}
                    className="min-w-[12rem]"
                  >
                    Go to first unanswered
                  </Button>
                  <p className="text-xs text-amber-100/90">Use the navigator to jump directly to any incomplete question.</p>
                </div>
              </Card>
            ) : null}
            <AssessmentFlowTransition transitionKey={index}>
              {currentQuestion ? (
                <AssessmentQuestionCard
                  question={currentQuestion.prompt}
                  options={currentQuestion.options}
                  onSelect={onAnswer}
                  selected={selectedValue}
                  disabled={loading}
                />
              ) : (
                <Card className="space-y-3 border-border/70 bg-panel/92">
                  <h2 className="text-xl font-semibold">Loading questions…</h2>
                  <p className="text-sm text-textSecondary">Please wait while we load your assessment.</p>
                </Card>
              )}
            </AssessmentFlowTransition>
            <div className="flex flex-wrap items-center gap-2.5 border-t border-border/60 pt-5">
              <Button variant="secondary" onClick={goBack} className="active:translate-y-[1px]" disabled={index === 0 || loading}>
                Back
              </Button>
              <Button onClick={goNext} className="min-w-[6rem] active:translate-y-[1px]" disabled={index >= totalQuestions - 1 || loading}>
                Next
              </Button>
              <Button
                onClick={completeAssessment}
                disabled={completing}
                className="min-w-[10rem] active:translate-y-[1px]"
              >
                {completing ? 'Completing…' : 'Complete Assessment'}
              </Button>
              <div className="ml-auto flex min-w-[12.5rem] items-center justify-end gap-3">
                {showSaveStatus ? <p className="min-w-[9.5rem] text-right text-xs text-textSecondary/75">{saveStatusLabel}</p> : null}
                <p className="rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs uppercase tracking-[0.14em] text-textSecondary">
                  {progress}% complete
                </p>
              </div>
            </div>
          </AssessmentShell>
        )}
      </div>
    </AppShell>
  )
}
