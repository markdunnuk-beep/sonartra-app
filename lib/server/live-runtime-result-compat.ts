import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '@/lib/admin/domain/assessment-package-v2'
import type { MaterializedAssessmentOutputsV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import type { AssessmentEvaluationResultV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import type { CompiledRuntimeExecutionResultV2 } from '@/lib/admin/domain/runtime-plan-v2-executor'
import type { PreparedRuntimeExecutionBundleV2 } from '@/lib/admin/domain/runtime-execution-adapter-v2'

export interface V2RuntimeResultCompatibilityPayload {
  /**
   * Persisted compatibility payload consumed by legacy result-read surfaces.
   * Runtime-v2 execution details remain explicitly namespaced under runtimeV2/runtimeExecution.
   */
  contractVersion: 'package_contract_v2'
  compatibilityShape: 'live_runtime_v2_persisted_compat/v1'
  runtimeVersion: string
  packageSchemaVersion: typeof SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
  packageMetadata: {
    assessmentKey: string
    assessmentName: string
    packageSemver: string
  }
  evaluation: AssessmentEvaluationResultV2
  materializedOutputs: MaterializedAssessmentOutputsV2
  runtimeExecution: {
    status: CompiledRuntimeExecutionResultV2['status']
    outcome: CompiledRuntimeExecutionResultV2['outcome']
    summary: CompiledRuntimeExecutionResultV2['summary']
    stageStatus: CompiledRuntimeExecutionResultV2['stages']
    issues: CompiledRuntimeExecutionResultV2['issues']
  }
  runtimeV2: {
    routing: {
      source: 'live_runtime_execution_adapter'
      summary: 'supported_live_runtime_execution'
    }
    execution: V2RuntimeResultCompatibilityPayload['runtimeExecution']
  }
  completedAt: string | null
  scoredAt: string | null
}

export function mapLiveRuntimeExecutionToPersistedCompatibilityPayload(input: {
  bundle: PreparedRuntimeExecutionBundleV2
  execution: CompiledRuntimeExecutionResultV2
  evaluation: AssessmentEvaluationResultV2
  materializedOutputs: MaterializedAssessmentOutputsV2
  completedAt: string | null
  scoredAt: string
}): V2RuntimeResultCompatibilityPayload {
  return {
    contractVersion: 'package_contract_v2',
    compatibilityShape: 'live_runtime_v2_persisted_compat/v1',
    runtimeVersion: input.bundle.runtimeArtifact.runtimeVersion,
    packageSchemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
    packageMetadata: {
      assessmentKey: input.bundle.metadata.assessmentKey,
      assessmentName: input.bundle.metadata.assessmentName,
      packageSemver: input.bundle.metadata.packageSemver,
    },
    evaluation: input.evaluation,
    materializedOutputs: input.materializedOutputs,
    runtimeExecution: {
      status: input.execution.status,
      outcome: input.execution.outcome,
      summary: input.execution.summary,
      stageStatus: input.execution.stages,
      issues: input.execution.issues,
    },
    runtimeV2: {
      routing: {
        source: 'live_runtime_execution_adapter',
        summary: 'supported_live_runtime_execution',
      },
      execution: {
        status: input.execution.status,
        outcome: input.execution.outcome,
        summary: input.execution.summary,
        stageStatus: input.execution.stages,
        issues: input.execution.issues,
      },
    },
    completedAt: input.completedAt,
    scoredAt: input.scoredAt,
  }
}
