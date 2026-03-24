import { evaluateAssessmentPackageV2, type AssessmentEvaluationResultV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import { materializeAssessmentOutputsV2, type MaterializedAssessmentOutputsV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import {
  executePreparedRuntimeExecutionBundleV2,
  preparePackageExecutionBundleForAssessmentVersion,
  type PreparedRuntimeExecutionBundleV2,
} from '@/lib/admin/domain/runtime-execution-adapter-v2'
import { classifyPackageContract } from '@/lib/admin/server/assessment-package-import'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '@/lib/admin/domain/assessment-package-v2'
import { evaluatePackageV2LiveRuntimeSupport } from '@/lib/package-contract-v2-live-runtime'
import { parseStoredValidatedAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2'

export interface LiveRuntimeExecutionRoutingDecision {
  contractVersion: 'legacy_v1' | 'package_contract_v2'
  classifier: 'legacy_contract_v1' | 'canonical_contract_v2' | 'runtime_contract_v2' | 'unknown_or_invalid'
  liveRuntimeSupported: boolean
  reason: string | null
}

interface StoredReadinessState {
  capabilities?: {
    liveRuntimeSupported?: boolean
  }
}

interface StoredValidationReport {
  analysis?: {
    classifier?: LiveRuntimeExecutionRoutingDecision['classifier']
    readinessState?: StoredReadinessState
  }
  readiness?: {
    liveRuntimeEnabled?: boolean
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseStoredValidationReport(value: unknown): StoredValidationReport | null {
  return isRecord(value) ? (value as StoredValidationReport) : null
}

export function resolveLiveRuntimeRoutingDecision(input: {
  packageSchemaVersion: string | null
  storedDefinitionPayload: unknown
  packageValidationReport: unknown
}): LiveRuntimeExecutionRoutingDecision {
  if (
    input.packageSchemaVersion !== SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
    && input.packageSchemaVersion !== 'sonartra.assessment.package.v2'
  ) {
    return {
      contractVersion: 'legacy_v1',
      classifier: 'legacy_contract_v1',
      liveRuntimeSupported: false,
      reason: 'Package schema is not Package Contract v2.',
    }
  }

  const report = parseStoredValidationReport(input.packageValidationReport)
  const classified = classifyPackageContract(input.storedDefinitionPayload)
  const classifier = report?.analysis?.classifier ?? classified.classifier
  const liveRuntimeSupportedFromState = report?.analysis?.readinessState?.capabilities?.liveRuntimeSupported === true
  const liveRuntimeEnabledFromReadiness = report?.readiness?.liveRuntimeEnabled === true
  const fallbackSupport = evaluatePackageV2LiveRuntimeSupport(
    classified.classifier === 'canonical_contract_v2' ? parseStoredValidatedAssessmentPackageV2(input.storedDefinitionPayload) : null,
  )
  const liveRuntimeSupported = liveRuntimeSupportedFromState
    || (liveRuntimeEnabledFromReadiness && classifier === 'runtime_contract_v2')
    || (!report && fallbackSupport.supported)

  if (classifier !== 'runtime_contract_v2' && report?.analysis?.classifier) {
    return {
      contractVersion: 'package_contract_v2',
      classifier,
      liveRuntimeSupported: false,
      reason: 'Package Contract v2 payload is not runtime-contract classified for live execution.',
    }
  }

  if (!liveRuntimeSupported) {
    return {
      contractVersion: 'package_contract_v2',
      classifier,
      liveRuntimeSupported: false,
      reason: 'Package Contract v2 runtime support is not enabled for live execution readiness.',
    }
  }

  return {
    contractVersion: 'package_contract_v2',
    classifier,
    liveRuntimeSupported: true,
    reason: null,
  }
}

export interface LiveRuntimeExecutionAdapterResult {
  bundle: PreparedRuntimeExecutionBundleV2
  executionResult: ReturnType<typeof executePreparedRuntimeExecutionBundleV2>
  compatibility: {
    evaluation: AssessmentEvaluationResultV2
    materializedOutputs: MaterializedAssessmentOutputsV2
  }
}

export function executeLiveRuntimeBundleWithCompatibility(input: {
  storedDefinitionPayload: unknown
  packageValidationReport: unknown
  responses: Record<string, unknown>
  evaluationId: string
  evaluationTimestamp: string
}): LiveRuntimeExecutionAdapterResult {
  const routing = resolveLiveRuntimeRoutingDecision({
    packageSchemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
    storedDefinitionPayload: input.storedDefinitionPayload,
    packageValidationReport: input.packageValidationReport,
  })

  if (!routing.liveRuntimeSupported) {
    throw new Error(routing.reason ?? 'Package Contract v2 is not supported for live runtime execution.')
  }

  const prepared = preparePackageExecutionBundleForAssessmentVersion({
    storedPackage: input.storedDefinitionPayload,
  })

  if (!prepared.ok || !prepared.bundle) {
    throw new Error(prepared.errors[0]?.message ?? 'Package Contract v2 runtime bundle could not be prepared safely for live execution.')
  }

  const executionResult = executePreparedRuntimeExecutionBundleV2({
    bundle: prepared.bundle,
    responses: input.responses,
    evaluationTimestamp: input.evaluationTimestamp,
  })

  if (!executionResult.executionResult || executionResult.executionResult.status === 'failed') {
    throw new Error(executionResult.errors[0]?.message ?? 'Compiled runtime plan execution failed for this live assessment.')
  }

  const evaluation = evaluateAssessmentPackageV2(prepared.bundle.runtimeArtifact, input.responses, {
    includeTrace: true,
    evaluationId: input.evaluationId,
  })
  const materializedOutputs = materializeAssessmentOutputsV2(prepared.bundle.runtimeArtifact, evaluation)

  return {
    bundle: prepared.bundle,
    executionResult,
    compatibility: {
      evaluation,
      materializedOutputs,
    },
  }
}
