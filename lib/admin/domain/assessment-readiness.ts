import type { AdminAssessmentPackageReadinessFlags, AssessmentPackageContractClassifier } from '@/lib/admin/server/assessment-package-import'

export type AdminAssessmentReadinessMilestone =
  | 'structurally_invalid'
  | 'importable'
  | 'runtime_compilable'
  | 'compiled_plan_available'
  | 'admin_executable'
  | 'preview_simulation_ready'
  | 'live_runtime_supported'
  | 'publish_ready'

export interface AdminAssessmentReadinessState {
  milestone: AdminAssessmentReadinessMilestone
  classifier: AssessmentPackageContractClassifier
  capabilities: {
    structurallyValid: boolean
    importable: boolean
    runtimeCompilable: boolean
    compiledPlanAvailable: boolean
    adminExecutable: boolean
    previewSimulationReady: boolean
    liveRuntimeSupported: boolean
    publishReady: boolean
  }
}

export function deriveReadinessState(input: {
  classifier: AssessmentPackageContractClassifier
  readiness: AdminAssessmentPackageReadinessFlags
  compiledPlanAvailable?: boolean
}): AdminAssessmentReadinessState {
  const compiledPlanAvailable = Boolean(input.compiledPlanAvailable)
  const capabilities = {
    structurallyValid: input.readiness.structurallyValid,
    importable: input.readiness.importable,
    runtimeCompilable: input.readiness.compilable,
    compiledPlanAvailable,
    adminExecutable: input.readiness.evaluatable,
    previewSimulationReady: input.readiness.simulatable,
    liveRuntimeSupported: input.readiness.liveRuntimeEnabled,
    publishReady: input.readiness.publishable,
  }

  let milestone: AdminAssessmentReadinessMilestone = 'structurally_invalid'
  if (capabilities.importable) milestone = 'importable'
  if (capabilities.runtimeCompilable) milestone = 'runtime_compilable'
  if (capabilities.compiledPlanAvailable) milestone = 'compiled_plan_available'
  if (capabilities.adminExecutable) milestone = 'admin_executable'
  if (capabilities.previewSimulationReady) milestone = 'preview_simulation_ready'
  if (capabilities.liveRuntimeSupported) milestone = 'live_runtime_supported'
  if (capabilities.publishReady) milestone = 'publish_ready'

  return {
    milestone,
    classifier: input.classifier,
    capabilities,
  }
}
