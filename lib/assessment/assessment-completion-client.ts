import type { CompleteAssessmentResponse } from '@/lib/assessment-types'
import { deriveAssessmentSessionState } from '@/lib/assessment-session'
import type { AssessmentWorkspaceEntryState } from '@/lib/assessment/assessment-workspace-framing'
import type { IndividualLifecycleState } from '@/lib/server/assessment-readiness'

interface AssessmentQuestionRef {
  questionNumber: number
}

export interface AssessmentCompletionSubmissionPlan {
  isSubmittable: boolean
  unansweredCount: number
  firstUnansweredIndex: number | null
  currentQuestionSave:
    | {
        questionNumber: number
        responseValue: number
      }
    | null
}

export interface AssessmentCompletionClientOutcome {
  redirectTo: string | null
  lifecycleState: IndividualLifecycleState
  workspaceEntryState: AssessmentWorkspaceEntryState
  clearActiveAssessment: boolean
  notice: string | null
}

export function buildAssessmentCompletionSubmissionPlan(
  questions: AssessmentQuestionRef[],
  answers: Record<number, number>,
  index: number,
): AssessmentCompletionSubmissionPlan {
  const sessionState = deriveAssessmentSessionState(questions, answers, index)
  const currentQuestion = questions[index]
  const currentAnswer = currentQuestion ? answers[currentQuestion.questionNumber] : undefined

  return {
    isSubmittable: sessionState.isAssessmentComplete,
    unansweredCount: sessionState.unansweredCount,
    firstUnansweredIndex: sessionState.firstUnansweredIndex,
    currentQuestionSave:
      currentQuestion && currentAnswer !== undefined
        ? {
            questionNumber: currentQuestion.questionNumber,
            responseValue: currentAnswer,
          }
        : null,
  }
}

export function resolveAssessmentCompletionClientOutcome(response: CompleteAssessmentResponse): AssessmentCompletionClientOutcome {
  if (!response.ok) {
    return {
      redirectTo: null,
      lifecycleState: 'error',
      workspaceEntryState: 'attention_required',
      clearActiveAssessment: false,
      notice: response.error,
    }
  }

  switch (response.resultStatus) {
    case 'succeeded':
      return {
        redirectTo: '/results/individual',
        lifecycleState: 'ready',
        workspaceEntryState: 'results_ready',
        clearActiveAssessment: true,
        notice: null,
      }
    case 'failed':
      return {
        redirectTo: '/results/individual',
        lifecycleState: 'error',
        workspaceEntryState: 'attention_required',
        clearActiveAssessment: true,
        notice: response.warning?.message ?? 'Assessment completed but result generation failed.',
      }
    case 'pending':
    default:
      return {
        redirectTo: '/results/individual',
        lifecycleState: 'completed_processing',
        workspaceEntryState: 'results_processing',
        clearActiveAssessment: true,
        notice: null,
      }
  }
}
