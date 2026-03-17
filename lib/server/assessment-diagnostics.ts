type DiagnosticValue = string | number | boolean | null | undefined

export function logAssessmentDiagnostic(stage: string, payload: Record<string, DiagnosticValue>) {
  const enabled =
    process.env.SONARTRA_ASSESSMENT_DIAGNOSTICS === '1' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NODE_ENV === 'development'

  if (!enabled) return

  console.info('[assessment-diagnostic]', {
    stage,
    ...payload,
    timestamp: new Date().toISOString(),
  })
}

