export function resolvePreferredAssessmentId(queryAssessmentId: string | null, storedAssessmentId: string | null): string | null {
  if (queryAssessmentId && queryAssessmentId.trim().length > 0) {
    return queryAssessmentId
  }

  if (storedAssessmentId && storedAssessmentId.trim().length > 0) {
    return storedAssessmentId
  }

  return null
}

