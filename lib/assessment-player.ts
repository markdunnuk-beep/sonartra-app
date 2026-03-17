export function isFinalQuestionIndex(index: number, totalQuestions: number): boolean {
  return totalQuestions > 0 && index === totalQuestions - 1
}

export function shouldClearReviewModeOnAnswer(params: {
  reviewMode: boolean
  hadAnswer: boolean
}): boolean {
  return params.reviewMode && !params.hadAnswer
}
