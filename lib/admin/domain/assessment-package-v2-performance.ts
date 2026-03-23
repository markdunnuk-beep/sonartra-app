import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '@/lib/admin/domain/assessment-package-v2'
import type { AssessmentResultRow } from '@/lib/assessment-types'
import type { MaterializedAssessmentOutputsV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import type { AssessmentEvaluationResultV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'

export const PACKAGE_CONTRACT_V2_RESULT_ARTIFACT_VERSION = 'package-contract-v2-result/1'
export const PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION = 'package-contract-v2-report/1'
export const PACKAGE_CONTRACT_V2_HTML_RENDERER_VERSION = 'v2-html-renderer/2'
export const PACKAGE_CONTRACT_V2_COMPILE_CACHE_SCHEMA_VERSION = 'package-contract-v2-compile-cache/1'
export const PACKAGE_CONTRACT_V2_LARGE_ASSESSMENT_DIMENSION_WARNING_THRESHOLD = 80
export const PACKAGE_CONTRACT_V2_MAX_PREDICATE_EVALUATIONS = 20_000
export const PACKAGE_CONTRACT_V2_MAX_REPORT_JSON_BYTES = 250_000

export interface PackageRuntimeFingerprint {
  assessmentVersionId: string | null
  packageFingerprint: string
  schemaVersion: string
  cacheKey: string
}

export interface AssessmentPerformanceDiagnostic {
  stage: 'compile_cache' | 'evaluation_reuse' | 'report_reuse'
  event: string
  detail: string
  metadata?: Record<string, unknown>
}

export interface V2PersistedEvaluationArtifact {
  contractVersion: 'package_contract_v2'
  runtimeVersion: string
  packageSchemaVersion: typeof SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
  resultArtifactVersion: string
  packageFingerprint: string
  compiledAt: string
  packageMetadata: {
    assessmentKey: string
    assessmentName: string
    packageSemver: string
  }
  evaluation: AssessmentEvaluationResultV2
  materializedOutputs: MaterializedAssessmentOutputsV2
  completedAt: string | null
  scoredAt: string | null
  generatedAt: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isPersistedEvaluationArtifact(value: unknown): value is V2PersistedEvaluationArtifact {
  return isRecord(value)
    && value.contractVersion === 'package_contract_v2'
    && typeof value.runtimeVersion === 'string'
    && typeof value.packageSchemaVersion === 'string'
    && typeof value.packageFingerprint === 'string'
    && typeof value.resultArtifactVersion === 'string'
    && typeof value.compiledAt === 'string'
    && isRecord(value.evaluation)
    && isRecord(value.materializedOutputs)
}

export interface EvaluationArtifactReuseDecision {
  reuse: boolean
  reason:
    | 'missing_result'
    | 'result_not_complete'
    | 'invalid_payload'
    | 'version_mismatch'
    | 'package_mismatch'
    | 'schema_mismatch'
    | 'missing_materialized_outputs'
    | 'valid'
  artifact: V2PersistedEvaluationArtifact | null
}

export function decideEvaluationArtifactReuse(input: {
  result: AssessmentResultRow | null | undefined
  packageFingerprint: string
  schemaVersion?: string | null
  expectedResultArtifactVersion?: string
}): EvaluationArtifactReuseDecision {
  if (!input.result) {
    return { reuse: false, reason: 'missing_result', artifact: null }
  }
  if (input.result.status !== 'complete') {
    return { reuse: false, reason: 'result_not_complete', artifact: null }
  }
  if (!isPersistedEvaluationArtifact(input.result.result_payload)) {
    return { reuse: false, reason: 'invalid_payload', artifact: null }
  }

  const artifact = input.result.result_payload
  if (artifact.resultArtifactVersion !== (input.expectedResultArtifactVersion ?? PACKAGE_CONTRACT_V2_RESULT_ARTIFACT_VERSION)) {
    return { reuse: false, reason: 'version_mismatch', artifact }
  }
  if (artifact.packageSchemaVersion !== (input.schemaVersion ?? SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2)) {
    return { reuse: false, reason: 'schema_mismatch', artifact }
  }
  if (artifact.packageFingerprint !== input.packageFingerprint) {
    return { reuse: false, reason: 'package_mismatch', artifact }
  }
  if (!isRecord(artifact.materializedOutputs) || !isRecord(artifact.materializedOutputs.reportDocument)) {
    return { reuse: false, reason: 'missing_materialized_outputs', artifact }
  }

  return { reuse: true, reason: 'valid', artifact }
}
