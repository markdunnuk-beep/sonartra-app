'use client'

import React from 'react'
import { AssessmentFlowTransition } from '@/components/assessment/AssessmentFlowTransition'
import { AssessmentWorkspaceFramingPanel } from '@/components/assessment/AssessmentWorkspaceFramingPanel'
import { AssessmentQuestionNavigator } from '@/components/assessment/AssessmentQuestionNavigator'
import { AssessmentProgress, AssessmentProgressRail } from '@/components/assessment/AssessmentProgress'
import { AssessmentShell } from '@/components/assessment/AssessmentShell'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { AssessmentQuestionCard, type AssessmentQuestionOption } from '@/components/sections/AssessmentQuestionCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getAssessmentRepositoryInventory, getAssessmentRepositoryRecommendation } from '@/lib/assessment/assessment-repository-selectors'
import { deriveAssessmentWorkspaceFraming, resolveAssessmentWorkspaceEntryState, type AssessmentWorkspaceEntryState } from '@/lib/assessment/assessment-workspace-framing'
import { buildAssessmentCompletionSubmissionPlan, resolveAssessmentCompletionClientOutcome } from '@/lib/assessment/assessment-completion-client'
import { isFinalQuestionIndex, shouldClearReviewModeOnAnswer } from '@/lib/assessment-player'
import { deriveAssessmentSessionState, getResumeQuestionIndex } from '@/lib/assessment-session'
import { deriveAssessmentEntryPhase } from '@/lib/assessment-entry-state'
import { mapLifecyclePresentation } from '@/lib/lifecycle-presentation'
import { type IndividualLifecycleResolution, type IndividualLifecycleState } from '@/lib/server/assessment-readiness'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CompleteAssessmentResponse } from '@/lib/assessment-types'

const ACTIVE_ASSESSMENT_STORAGE_KEY = 'sonartra_active_assessment_id'
const WORKSPACE_ASSESSMENT_DEFINITION_ID = 'signals'

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

interface AssessmentLifecycleCardProps {
  lifecycleState: IndividualLifecycleState
  startError: string | null
  loading: boolean
  onPrimaryAction: () => void | Promise<void>
}

const WORKSPACE_PAGE_TITLE = 'Assessment Workspace'
const WORKSPACE_PAGE_SUBTITLE = 'Structured assessment flow with autosave continuity and results handoff.'

export function AssessmentLifecycleCard({ lifecycleState, startError, loading, onPrimaryAction }: AssessmentLifecycleCardProps) {
  const presentation = mapLifecyclePresentation(lifecycleState)
  const isInteractivePrimary = presentation.assessmentPrimaryActionHref === null

  return (
    <AssessmentShell className="max-w-[70rem] p-5 sm:p-8 lg:p-10">
      <Card className="mx-auto w-full border-border/75 bg-panel/82 px-0 py-0">
        <div className="grid gap-5 px-6 py-6 sm:px-8 sm:py-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-6 lg:px-10">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/80">{presentation.assessmentEyebrow}</p>
              <h2 className="text-[1.9rem] font-semibold tracking-tight text-textPrimary sm:text-[2.1rem]">{presentation.assessmentTitle}</h2>
              <p className="max-w-2xl text-sm leading-6 text-textSecondary sm:text-[0.98rem]">{presentation.assessmentBody}</p>
            </div>
            {startError ? <p className="text-sm text-rose-300">{startError}</p> : null}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {isInteractivePrimary ? (
                <Button onClick={() => void onPrimaryAction()} className="min-w-[11rem] px-6" disabled={loading}>
                  {loading ? 'Starting…' : presentation.assessmentPrimaryActionLabel}
                </Button>
              ) : (
                <Button href={presentation.assessmentPrimaryActionHref ?? undefined} className="min-w-[11rem] px-6">
                  {presentation.assessmentPrimaryActionLabel}
                </Button>
              )}
              {presentation.assessmentSecondaryActionLabel && presentation.assessmentSecondaryActionHref ? (
                <Button variant="secondary" href={presentation.assessmentSecondaryActionHref} className="min-w-[11rem] px-6" disabled={loading && isInteractivePrimary}>
                  {presentation.assessmentSecondaryActionLabel}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2.5 self-start">
            <div className="space-y-1 rounded-xl border border-border/70 bg-bg/25 px-3.5 py-3 sm:px-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/75">Status</p>
              <p className="text-sm text-textPrimary">{presentation.dashboardStatusLabel}</p>
            </div>
            <div className="space-y-1 rounded-xl border border-border/70 bg-bg/25 px-3.5 py-3 sm:px-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/75">Next step</p>
              <p className="text-sm text-textPrimary">{presentation.dashboardDetailTitle}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border/70 px-6 py-4 sm:px-8 sm:py-5 lg:px-10">
          <p className="max-w-3xl text-sm leading-6 text-textSecondary">{presentation.dashboardDetailFootnote}</p>
        </div>
      </Card>
    </AssessmentShell>
  )
}

interface AssessmentPageClientProps {
  initialAssessmentId: string | null
  initialDefinitionId: string | null
  canonicalAssessmentId: string | null
  initialLifecycle: IndividualLifecycleResolution
}

export default function AssessmentPageClient({ initialAssessmentId, initialDefinitionId, canonicalAssessmentId, initialLifecycle }: AssessmentPageClientProps) {
  const [viewState, setViewState] = useState<'intro' | 'starting' | 'active'>('intro')
  const [assessmentId, setAssessmentId] = useState<string | null>(canonicalAssessmentId ?? initialAssessmentId)
  const [lifecycleState, setLifecycleState] = useState<IndividualLifecycleState>(initialLifecycle.state)
  const [workspaceEntryState, setWorkspaceEntryState] = useState<AssessmentWorkspaceEntryState>(resolveAssessmentWorkspaceEntryState(initialLifecycle.state))
  const [questions, setQuestions] = useState<LiveQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [savingCount, setSavingCount] = useState(0)
  const [completing, setCompleting] = useState(false)
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
  const isFinalQuestion = isFinalQuestionIndex(index, totalQuestions)
  const workspaceRecommendation = useMemo(() => getAssessmentRepositoryRecommendation(getAssessmentRepositoryInventory()), [])
  const workspaceFraming = useMemo(
    () => deriveAssessmentWorkspaceFraming(WORKSPACE_ASSESSMENT_DEFINITION_ID, workspaceEntryState, workspaceRecommendation),
    [workspaceEntryState, workspaceRecommendation],
  )

  useEffect(() => {
    if (lifecycleState !== 'in_progress') {
      window.localStorage.removeItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
    }
  }, [lifecycleState])

  useEffect(() => {
    if (viewState !== 'active') {
      setWorkspaceEntryState(resolveAssessmentWorkspaceEntryState(lifecycleState))
    }
  }, [lifecycleState, viewState])

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

    return savePromise
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
    setLifecycleState(data.assessment.status === 'completed' ? 'completed_processing' : 'in_progress')
    setAssessmentId(data.assessment.id)
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

  const resolveResumeAssessmentId = () => {
    if (lifecycleState === 'in_progress' && canonicalAssessmentId) {
      return canonicalAssessmentId
    }

    if (lifecycleState === 'in_progress' && initialAssessmentId) {
      return initialAssessmentId
    }

    if (lifecycleState === 'in_progress') {
      return window.localStorage.getItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
    }

    return null
  }

  const startAssessment = async () => {
    setViewState('starting')
    setLoading(true)
    setStartError(null)
    setAssessmentError(null)

    try {
      const resumableAssessmentId = resolveResumeAssessmentId()

      if (resumableAssessmentId) {
        try {
          setWorkspaceEntryState('resume')
          setAssessmentId(resumableAssessmentId)
          await fetchAssessmentQuestions(resumableAssessmentId, 'resume')
          window.localStorage.setItem(ACTIVE_ASSESSMENT_STORAGE_KEY, resumableAssessmentId)
          return
        } catch (resumeError) {
          console.error('[assessment] canonical resume failed, falling back to new start', {
            resumableAssessmentId,
            error: resumeError,
          })
          window.localStorage.removeItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
          setAssessmentId(null)
        }
      }

      setWorkspaceEntryState('start')

      const startResponse = await fetch('/api/assessments/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'direct',
          assessmentDefinitionId: initialDefinitionId ?? undefined,
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
      setLifecycleState('in_progress')
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
    if (!activeQuestion) return null

    const currentAnswer = answersRef.current[activeQuestion.questionNumber]
    if (currentAnswer === undefined) return null

    const responseTimeMs = Math.max(0, Date.now() - questionShownAtRef.current)
    return saveResponseInBackground(activeQuestion.questionNumber, currentAnswer, responseTimeMs)
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

    const hadAnswer = answers[currentQuestion.questionNumber] !== undefined

    setAssessmentError(null)
    if (shouldClearReviewModeOnAnswer({ reviewMode, hadAnswer })) {
      setReviewMode(false)
    }
    answersRef.current = { ...answersRef.current, [currentQuestion.questionNumber]: responseValue }
    setAnswers((prev) => ({ ...prev, [currentQuestion.questionNumber]: responseValue }))
  }

  const completeAssessment = async () => {
    if (!assessmentId) return

    const submissionPlan = buildAssessmentCompletionSubmissionPlan(questions, answersRef.current, index)

    if (!submissionPlan.isSubmittable) {
      setReviewMode(true)
      setAssessmentError(
        `You still have ${submissionPlan.unansweredCount} unanswered question${submissionPlan.unansweredCount === 1 ? '' : 's'}. Complete all questions before submission.`,
      )

      if (submissionPlan.firstUnansweredIndex !== null) {
        goToQuestion(submissionPlan.firstUnansweredIndex)
      }

      return
    }

    setCompleting(true)
    setAssessmentError(null)
    setStartError(null)

    try {
      const currentQuestionSave = persistCurrentQuestion()

      if (currentQuestionSave) {
        await currentQuestionSave
      }

      if (pendingSavesRef.current.size > 0) {
        await Promise.allSettled([...pendingSavesRef.current.values()])
      }

      const response = await fetch('/api/assessments/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId }),
      })

      const data = (await response.json()) as CompleteAssessmentResponse
      if (!response.ok || !data.ok) {
        throw new Error(data.ok ? 'Unable to complete assessment.' : data.error ?? 'Unable to complete assessment.')
      }

      const outcome = resolveAssessmentCompletionClientOutcome(data)

      if (outcome.clearActiveAssessment) {
        setQuestions([])
        setAnswers({})
        answersRef.current = {}
        setIndex(0)
        setViewState('intro')
        window.localStorage.removeItem(ACTIVE_ASSESSMENT_STORAGE_KEY)
      }

      setLifecycleState(outcome.lifecycleState)
      setWorkspaceEntryState(outcome.workspaceEntryState)
      setStartError(outcome.notice)

      if (outcome.redirectTo) {
        window.location.assign(outcome.redirectTo)
      }
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
        <TopHeader title={WORKSPACE_PAGE_TITLE} subtitle={WORKSPACE_PAGE_SUBTITLE} />
        <AssessmentWorkspaceFramingPanel framing={workspaceFraming} />

        {entryPhase !== 'active' ? (
          <AssessmentLifecycleCard lifecycleState={lifecycleState} startError={startError} loading={entryPhase === 'starting'} onPrimaryAction={startAssessment} />
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
              {isFinalQuestion ? (
                <Button
                  onClick={completeAssessment}
                  disabled={completing}
                  className="min-w-[10rem] active:translate-y-[1px]"
                >
                  {completing ? 'Completing…' : 'Complete Assessment'}
                </Button>
              ) : (
                <Button onClick={goNext} className="min-w-[6rem] active:translate-y-[1px]" disabled={loading}>
                  Next
                </Button>
              )}
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
