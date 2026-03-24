export type AssessmentPipelineBoundary = 'validation' | 'compiler' | 'execution'

/**
 * Stable boundary semantics used across import/readiness/review diagnostics.
 * - validation: payload structure + reference shape checks available before compilation.
 * - compiler: normalization/resolution/planning diagnostics while producing runtime artifacts.
 * - execution: runtime data/predicate/materialization diagnostics during an execution run.
 */
export const ASSESSMENT_PIPELINE_BOUNDARY_DESCRIPTIONS: Record<AssessmentPipelineBoundary, string> = {
  validation: 'Payload schema and structural reference correctness.',
  compiler: 'Runtime artifact resolvability and normalized execution-plan construction.',
  execution: 'Runtime data and application-time execution issues.',
}
