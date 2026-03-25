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
  classifier: 'legacy_contract_v1' | 'canonical_contract_v2' | 'runtime_contract_v2' | 'hybrid_mvp_contract_v1' | 'unknown_or_invalid'
  liveRuntimeSupported: boolean
  reasonCode:
    | 'schema_not_v2'
    | 'classifier_not_runtime_v2'
    | 'report_explicitly_not_supported'
    | 'report_missing_live_runtime_support'
    | 'report_metadata_incomplete'
    | 'fallback_not_supported'
    | null
  reason: string | null
  blockedReasons: Array<{
    code: NonNullable<LiveRuntimeExecutionRoutingDecision['reasonCode']>
    source: 'authoritative_report' | 'fallback'
    detail: string
  }>
  debug: {
    reportPresent: boolean
    reportClassifierPresent: boolean
    reportSupportPresent: boolean
    usedFallbackSupportInference: boolean
    fallbackSupport: boolean
  }
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

function buildBlockedDecision(input: {
  classifier: LiveRuntimeExecutionRoutingDecision['classifier']
  reasonCode: NonNullable<LiveRuntimeExecutionRoutingDecision['reasonCode']>
  reason: string
  source: 'authoritative_report' | 'fallback'
  debug: LiveRuntimeExecutionRoutingDecision['debug']
}): LiveRuntimeExecutionRoutingDecision {
  return {
    contractVersion: 'package_contract_v2',
    classifier: input.classifier,
    liveRuntimeSupported: false,
    reasonCode: input.reasonCode,
    reason: input.reason,
    blockedReasons: [{ code: input.reasonCode, source: input.source, detail: input.reason }],
    debug: input.debug,
  }
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
      reasonCode: 'schema_not_v2',
      reason: 'Package schema is not Package Contract v2.',
      blockedReasons: [{
        code: 'schema_not_v2',
        source: 'fallback',
        detail: 'Package schema is not Package Contract v2.',
      }],
      debug: {
        reportPresent: false,
        reportClassifierPresent: false,
        reportSupportPresent: false,
        usedFallbackSupportInference: false,
        fallbackSupport: false,
      },
    }
  }

  const report = parseStoredValidationReport(input.packageValidationReport)
  const classified = classifyPackageContract(input.storedDefinitionPayload)
  const reportClassifier = report?.analysis?.classifier
  const classifier = reportClassifier ?? classified.classifier
  const liveRuntimeSupportedFromState = report?.analysis?.readinessState?.capabilities?.liveRuntimeSupported === true
  const liveRuntimeDeniedFromState = report?.analysis?.readinessState?.capabilities?.liveRuntimeSupported === false
  const reportSupportPresent = typeof report?.analysis?.readinessState?.capabilities?.liveRuntimeSupported === 'boolean'
  const reportClassifierPresent = typeof reportClassifier === 'string'
  const reportPresent = Boolean(report)
  const fallbackSupport = evaluatePackageV2LiveRuntimeSupport(
    classified.classifier === 'canonical_contract_v2' ? parseStoredValidatedAssessmentPackageV2(input.storedDefinitionPayload) : null,
  )
  const debug: LiveRuntimeExecutionRoutingDecision['debug'] = {
    reportPresent,
    reportClassifierPresent,
    reportSupportPresent,
    usedFallbackSupportInference: !reportPresent,
    fallbackSupport: fallbackSupport.supported,
  }

  if (reportPresent) {
    if (classifier === 'canonical_contract_v2') {
      debug.usedFallbackSupportInference = true
      if (fallbackSupport.supported) {
        return {
          contractVersion: 'package_contract_v2',
          classifier,
          liveRuntimeSupported: true,
          reasonCode: null,
          reason: null,
          blockedReasons: [],
          debug,
        }
      }

      return buildBlockedDecision({
        classifier,
        reasonCode: 'fallback_not_supported',
        reason: fallbackSupport.issues[0]?.message ?? 'Package Contract v2 runtime support is not enabled for live execution readiness.',
        source: 'fallback',
        debug,
      })
    }

    if (classifier !== 'runtime_contract_v2') {
      return buildBlockedDecision({
        classifier,
        reasonCode: 'classifier_not_runtime_v2',
        reason: 'Package Contract v2 payload is not runtime-contract classified for live execution.',
        source: 'authoritative_report',
        debug,
      })
    }

    if (!reportSupportPresent) {
      return buildBlockedDecision({
        classifier,
        reasonCode: 'report_metadata_incomplete',
        reason: 'Stored validation report is present but missing explicit live runtime support metadata.',
        source: 'authoritative_report',
        debug,
      })
    }

    if (liveRuntimeDeniedFromState) {
      return buildBlockedDecision({
        classifier,
        reasonCode: 'report_explicitly_not_supported',
        reason: 'Stored validation report explicitly marks this package as not live-runtime-supported.',
        source: 'authoritative_report',
        debug,
      })
    }

    if (!liveRuntimeSupportedFromState) {
      return buildBlockedDecision({
        classifier,
        reasonCode: 'report_missing_live_runtime_support',
        reason: 'Stored validation report does not authorize live runtime execution support.',
        source: 'authoritative_report',
        debug,
      })
    }

    return {
      contractVersion: 'package_contract_v2',
      classifier,
      liveRuntimeSupported: true,
      reasonCode: null,
      reason: null,
      blockedReasons: [],
      debug,
    }
  }

  if (classifier !== 'runtime_contract_v2') {
    if (classifier === 'canonical_contract_v2' && fallbackSupport.supported) {
      return {
        contractVersion: 'package_contract_v2',
        classifier,
        liveRuntimeSupported: true,
        reasonCode: null,
        reason: null,
        blockedReasons: [],
        debug: {
          ...debug,
          usedFallbackSupportInference: true,
        },
      }
    }

    return buildBlockedDecision({
      classifier,
      reasonCode: 'classifier_not_runtime_v2',
      reason: 'Package Contract v2 payload is not runtime-contract classified for live execution.',
      source: 'fallback',
      debug,
    })
  }

  if (!fallbackSupport.supported) {
    return buildBlockedDecision({
      classifier,
      reasonCode: 'fallback_not_supported',
      reason: fallbackSupport.issues[0]?.message ?? 'Package Contract v2 runtime support is not enabled for live execution readiness.',
      source: 'fallback',
      debug,
    })
  }

  return {
    contractVersion: 'package_contract_v2',
    classifier,
    liveRuntimeSupported: true,
    reasonCode: null,
    reason: null,
    blockedReasons: [],
    debug,
  }
}

export interface LiveRuntimeExecutionAdapterResult {
  routing: LiveRuntimeExecutionRoutingDecision
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
    routing,
    bundle: prepared.bundle,
    executionResult,
    compatibility: {
      evaluation,
      materializedOutputs,
    },
  }
}
