export type AssessmentAnswerMap = Record<number, number>

export interface AssessmentQuestionRef {
  questionNumber: number
}

export type NavigatorQuestionState = 'answered' | 'unanswered' | 'current'

export interface NavigatorQuestionItem {
  index: number
  questionNumber: number
  state: NavigatorQuestionState
}

export interface AssessmentSessionState {
  answeredCount: number
  unansweredCount: number
  isAssessmentComplete: boolean
  unansweredQuestionNumbers: number[]
  unansweredIndices: number[]
  firstUnansweredIndex: number | null
  firstUnansweredQuestionNumber: number | null
  navigatorItems: NavigatorQuestionItem[]
}

export function getResumeQuestionIndex(questions: AssessmentQuestionRef[], answers: AssessmentAnswerMap): number {
  if (questions.length === 0) return 0

  const nextIncompleteIndex = questions.findIndex((question) => answers[question.questionNumber] === undefined)
  return nextIncompleteIndex === -1 ? Math.max(questions.length - 1, 0) : nextIncompleteIndex
}

export function deriveAssessmentSessionState(
  questions: AssessmentQuestionRef[],
  answers: AssessmentAnswerMap,
  currentIndex: number,
): AssessmentSessionState {
  const answeredQuestionNumbers = new Set(Object.keys(answers).map((key) => Number(key)).filter(Number.isInteger))

  const unansweredIndices: number[] = []
  const unansweredQuestionNumbers: number[] = []

  questions.forEach((question, index) => {
    if (!answeredQuestionNumbers.has(question.questionNumber)) {
      unansweredIndices.push(index)
      unansweredQuestionNumbers.push(question.questionNumber)
    }
  })

  const answeredCount = questions.length - unansweredIndices.length
  const unansweredCount = unansweredIndices.length
  const isAssessmentComplete = questions.length > 0 && unansweredCount === 0
  const firstUnansweredIndex = unansweredIndices[0] ?? null
  const firstUnansweredQuestionNumber = unansweredQuestionNumbers[0] ?? null

  const navigatorItems: NavigatorQuestionItem[] = questions.map((question, index) => {
    let state: NavigatorQuestionState = 'answered'

    if (!answeredQuestionNumbers.has(question.questionNumber)) {
      state = 'unanswered'
    }

    if (index === currentIndex) {
      state = 'current'
    }

    return {
      index,
      questionNumber: question.questionNumber,
      state,
    }
  })

  return {
    answeredCount,
    unansweredCount,
    isAssessmentComplete,
    unansweredQuestionNumbers,
    unansweredIndices,
    firstUnansweredIndex,
    firstUnansweredQuestionNumber,
    navigatorItems,
  }
}
