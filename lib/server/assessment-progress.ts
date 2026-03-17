export interface PersistedAssessmentProgress {
  progressCount: number;
  progressPercent: number;
}

export function derivePersistedAssessmentProgress(responseCount: number, totalQuestions: number): PersistedAssessmentProgress {
  const safeTotal = Number.isFinite(totalQuestions) && totalQuestions > 0 ? Math.floor(totalQuestions) : 0;
  const safeResponses = Number.isFinite(responseCount) ? Math.max(0, Math.floor(responseCount)) : 0;

  if (safeTotal === 0) {
    return {
      progressCount: safeResponses,
      progressPercent: 0,
    };
  }

  const boundedCount = Math.min(safeResponses, safeTotal);

  return {
    progressCount: boundedCount,
    progressPercent: Math.round((boundedCount * 10000) / safeTotal) / 100,
  };
}
