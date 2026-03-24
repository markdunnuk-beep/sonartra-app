import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '@/lib/admin/domain/assessment-package-v2'
import type { MaterializedAssessmentOutputsV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import type { AssessmentEvaluationResultV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import type { CompiledRuntimeExecutionResultV2 } from '@/lib/admin/domain/runtime-plan-v2-executor'
import type { PreparedRuntimeExecutionBundleV2 } from '@/lib/admin/domain/runtime-execution-adapter-v2'

export interface V2RuntimeResultCompatibilityPayload {
  contractVersion: 'package_contract_v2'
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
    completedAt: input.completedAt,
    scoredAt: input.scoredAt,
  }
}
