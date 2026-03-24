import type { AdminAssessmentPackageReadinessFlags, AdminAssessmentImportAnalysis } from '@/lib/admin/server/assessment-package-import'
import { deriveReadinessState, type AdminAssessmentReadinessState } from '@/lib/admin/domain/assessment-readiness'
import { compileAssessmentPackageV2, type ExecutableAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import { parseStoredValidatedAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2'
import { compileRuntimeContractV2, type CompiledRuntimePlanV2 } from '@/lib/admin/domain/runtime-plan-v2-compiler'
import { validateRuntimeContractV2 } from '@/lib/admin/domain/package-runtime-v2'
import {
  executeCompiledRuntimePlanV2,
  normalizeRuntimeResponsesForExecutionV2,
  type CompiledRuntimeExecutionResultV2,
  type RuntimeExecutionIssueV2,
} from '@/lib/admin/domain/runtime-plan-v2-executor'

export interface PreparedRuntimeExecutionBundleV2 {
  source: 'canonical_contract_v2' | 'runtime_contract_v2'
  runtimeArtifact: ExecutableAssessmentPackageV2
  compiledRuntimePlan: CompiledRuntimePlanV2
  metadata: {
    assessmentKey: string
    assessmentName: string
    packageSemver: string
  }
}

export interface PreparedRuntimeExecutionBundleResultV2 {
  ok: boolean
  readiness: AdminAssessmentPackageReadinessFlags
  readinessState: AdminAssessmentReadinessState
  errors: Array<{ path: string; message: string }>
  warnings: Array<{ path: string; message: string }>
  bundle: PreparedRuntimeExecutionBundleV2 | null
}

export interface AdminRuntimeExecutionResultV2 {
  ok: boolean
  readiness: AdminAssessmentPackageReadinessFlags
  readinessState: AdminAssessmentReadinessState
  bundle: PreparedRuntimeExecutionBundleV2 | null
  normalizedResponses: ReturnType<typeof normalizeRuntimeResponsesForExecutionV2>
  executionResult: CompiledRuntimeExecutionResultV2 | null
  errors: Array<{ path: string; message: string }>
  warnings: Array<{ path: string; message: string }>
}

function toReadiness(input: {
  structurallyValid: boolean
  compilable: boolean
  evaluatable: boolean
  simulatable: boolean
  runtimeExecutable: boolean
  liveRuntimeEnabled: boolean
}): AdminAssessmentPackageReadinessFlags {
  return {
    structurallyValid: input.structurallyValid,
    importable: input.structurallyValid,
    compilable: input.compilable,
    evaluatable: input.evaluatable,
    simulatable: input.simulatable,
    runtimeExecutable: input.runtimeExecutable,
    liveRuntimeEnabled: input.liveRuntimeEnabled,
    publishable: false,
  }
}

function toReadinessState(input: { classifier: 'canonical_contract_v2' | 'runtime_contract_v2'; readiness: AdminAssessmentPackageReadinessFlags; compiledPlanAvailable: boolean }): AdminAssessmentReadinessState {
  return deriveReadinessState({
    classifier: input.classifier,
    readiness: input.readiness,
    compiledPlanAvailable: input.compiledPlanAvailable,
  })
}

function mapExecutionIssues(issues: RuntimeExecutionIssueV2[]): Array<{ path: string; message: string }> {
  return issues.map((issue) => ({
    path: issue.path,
    message: `[${issue.stage}.${issue.code}] ${issue.message}`,
  }))
}

export function normalizeAssessmentResponsesForRuntimeExecution(input: unknown) {
  return normalizeRuntimeResponsesForExecutionV2(input)
}

export function preparePackageExecutionBundleForAssessmentVersion(input: {
  storedPackage: unknown
  analysis?: AdminAssessmentImportAnalysis | null
}): PreparedRuntimeExecutionBundleResultV2 {
  const errors: Array<{ path: string; message: string }> = []
  const warnings: Array<{ path: string; message: string }> = []

  const analysisBundle = input.analysis?.compiledRuntimeArtifact && input.analysis?.compiledRuntimePlan
    ? {
        runtimeArtifact: input.analysis.compiledRuntimeArtifact,
        compiledRuntimePlan: input.analysis.compiledRuntimePlan,
        source: (input.analysis.classifier === 'runtime_contract_v2' ? 'runtime_contract_v2' : 'canonical_contract_v2') as PreparedRuntimeExecutionBundleV2['source'],
      }
    : null

  if (analysisBundle) {
    const readiness = toReadiness({
      structurallyValid: true,
      compilable: true,
      evaluatable: true,
      simulatable: true,
      runtimeExecutable: analysisBundle.source === 'runtime_contract_v2',
      liveRuntimeEnabled: analysisBundle.source === 'runtime_contract_v2',
    })
    return {
      ok: true,
      readiness,
      readinessState: toReadinessState({
        classifier: analysisBundle.source === 'runtime_contract_v2' ? 'runtime_contract_v2' : 'canonical_contract_v2',
        readiness,
        compiledPlanAvailable: true,
      }),
      errors,
      warnings,
      bundle: {
        source: analysisBundle.source,
        runtimeArtifact: analysisBundle.runtimeArtifact,
        compiledRuntimePlan: analysisBundle.compiledRuntimePlan,
        metadata: {
          assessmentKey: analysisBundle.runtimeArtifact.metadata.assessmentKey,
          assessmentName: analysisBundle.runtimeArtifact.metadata.assessmentName,
          packageSemver: analysisBundle.runtimeArtifact.metadata.compatibility.packageSemver,
        },
      },
    }
  }

  const runtimeValidated = validateRuntimeContractV2(input.storedPackage)
  if (runtimeValidated.ok && runtimeValidated.normalizedRuntimePackage) {
    const runtimePlan = compileRuntimeContractV2(runtimeValidated.normalizedRuntimePackage)
    warnings.push(...runtimeValidated.warnings)
    if (!runtimePlan.ok || !runtimePlan.compiledPlan) {
      errors.push(...runtimePlan.diagnostics.filter((entry) => entry.severity === 'error').map((entry) => ({ path: entry.path, message: entry.message })))
      warnings.push(...runtimePlan.diagnostics.filter((entry) => entry.severity === 'warning').map((entry) => ({ path: entry.path, message: entry.message })))
      return {
        ok: false,
        readiness: toReadiness({
          structurallyValid: true,
          compilable: false,
          evaluatable: false,
          simulatable: false,
          runtimeExecutable: false,
          liveRuntimeEnabled: false,
        }),
        readinessState: toReadinessState({
          classifier: 'runtime_contract_v2',
          readiness: toReadiness({
            structurallyValid: true,
            compilable: false,
            evaluatable: false,
            simulatable: false,
            runtimeExecutable: false,
            liveRuntimeEnabled: false,
          }),
          compiledPlanAvailable: false,
        }),
        errors,
        warnings,
        bundle: null,
      }
    }

    const readiness = toReadiness({
      structurallyValid: true,
      compilable: true,
      evaluatable: true,
      simulatable: true,
      runtimeExecutable: true,
      liveRuntimeEnabled: true,
    })
    return {
      ok: true,
      readiness,
      readinessState: toReadinessState({ classifier: 'runtime_contract_v2', readiness, compiledPlanAvailable: true }),
      errors,
      warnings,
      bundle: {
        source: 'runtime_contract_v2',
        runtimeArtifact: runtimeValidated.normalizedRuntimePackage,
        compiledRuntimePlan: runtimePlan.compiledPlan,
        metadata: {
          assessmentKey: runtimeValidated.normalizedRuntimePackage.metadata.assessmentKey,
          assessmentName: runtimeValidated.normalizedRuntimePackage.metadata.assessmentName,
          packageSemver: runtimeValidated.normalizedRuntimePackage.metadata.compatibility.packageSemver,
        },
      },
    }
  }

  const canonical = parseStoredValidatedAssessmentPackageV2(input.storedPackage)
  const invalidReadiness = toReadiness({
    structurallyValid: false,
    compilable: false,
    evaluatable: false,
    simulatable: false,
    runtimeExecutable: false,
    liveRuntimeEnabled: false,
  })
  if (!canonical) {
    return {
      ok: false,
      readiness: invalidReadiness,
      readinessState: toReadinessState({ classifier: 'canonical_contract_v2', readiness: invalidReadiness, compiledPlanAvailable: false }),
      errors: [{ path: 'package', message: 'No valid canonical v2 or runtime v2 package is available for runtime execution.' }],
      warnings,
      bundle: null,
    }
  }

  const compiled = compileAssessmentPackageV2(canonical)
  if (!compiled.ok || !compiled.executablePackage) {
    errors.push(...compiled.diagnostics.filter((entry) => entry.severity === 'error').map((entry) => ({ path: entry.path, message: entry.message })))
    warnings.push(...compiled.diagnostics.filter((entry) => entry.severity === 'warning').map((entry) => ({ path: entry.path, message: entry.message })))
    const readiness = toReadiness({
      structurallyValid: true,
      compilable: false,
      evaluatable: false,
      simulatable: false,
      runtimeExecutable: false,
      liveRuntimeEnabled: false,
    })
    return {
      ok: false,
      readiness,
      readinessState: toReadinessState({ classifier: 'canonical_contract_v2', readiness, compiledPlanAvailable: false }),
      errors,
      warnings,
      bundle: null,
    }
  }

  const runtimePlan = compileRuntimeContractV2(compiled.executablePackage)
  if (!runtimePlan.ok || !runtimePlan.compiledPlan) {
    errors.push(...runtimePlan.diagnostics.filter((entry) => entry.severity === 'error').map((entry) => ({ path: entry.path, message: entry.message })))
    warnings.push(...runtimePlan.diagnostics.filter((entry) => entry.severity === 'warning').map((entry) => ({ path: entry.path, message: entry.message })))
    const readiness = toReadiness({
      structurallyValid: true,
      compilable: true,
      evaluatable: false,
      simulatable: false,
      runtimeExecutable: false,
      liveRuntimeEnabled: false,
    })
    return {
      ok: false,
      readiness,
      readinessState: toReadinessState({ classifier: 'canonical_contract_v2', readiness, compiledPlanAvailable: false }),
      errors,
      warnings,
      bundle: null,
    }
  }

  const readiness = toReadiness({
    structurallyValid: true,
    compilable: true,
    evaluatable: true,
    simulatable: true,
    runtimeExecutable: false,
    liveRuntimeEnabled: false,
  })
  return {
    ok: true,
    readiness,
    readinessState: toReadinessState({ classifier: 'canonical_contract_v2', readiness, compiledPlanAvailable: true }),
    errors,
    warnings,
    bundle: {
      source: 'canonical_contract_v2',
      runtimeArtifact: compiled.executablePackage,
      compiledRuntimePlan: runtimePlan.compiledPlan,
      metadata: {
        assessmentKey: compiled.executablePackage.metadata.assessmentKey,
        assessmentName: compiled.executablePackage.metadata.assessmentName,
        packageSemver: compiled.executablePackage.metadata.compatibility.packageSemver,
      },
    },
  }
}

export function executePreparedRuntimeExecutionBundleV2(input: {
  bundle: PreparedRuntimeExecutionBundleV2
  responses: unknown
  evaluationTimestamp?: string
}): AdminRuntimeExecutionResultV2 {
  const normalizedResponses = normalizeRuntimeResponsesForExecutionV2(input.responses)
  const executionResult = executeCompiledRuntimePlanV2(input.bundle.compiledRuntimePlan, normalizedResponses, {
    executablePackage: input.bundle.runtimeArtifact,
    evaluationTimestamp: input.evaluationTimestamp,
  })

  const executionErrors = mapExecutionIssues(executionResult.issues.filter((issue) => issue.fatal))
  const executionWarnings = mapExecutionIssues(executionResult.issues.filter((issue) => !issue.fatal))

  const readiness = toReadiness({
    structurallyValid: true,
    compilable: true,
    evaluatable: true,
    simulatable: true,
    runtimeExecutable: input.bundle.source === 'runtime_contract_v2',
    liveRuntimeEnabled: input.bundle.source === 'runtime_contract_v2',
  })
  return {
    ok: executionResult.status !== 'failed',
    readiness,
    readinessState: toReadinessState({
      classifier: input.bundle.source === 'runtime_contract_v2' ? 'runtime_contract_v2' : 'canonical_contract_v2',
      readiness,
      compiledPlanAvailable: true,
    }),
    bundle: input.bundle,
    normalizedResponses,
    executionResult,
    errors: executionErrors,
    warnings: executionWarnings,
  }
}

export function mapExecutionResultToLegacyScoreSummary(result: CompiledRuntimeExecutionResultV2): {
  issueCount: number
  fatalIssueCount: number
  triggeredOutputCount: number
} {
  return {
    issueCount: result.summary.issueCount,
    fatalIssueCount: result.summary.fatalIssueCount,
    triggeredOutputCount: result.outputs.matchedRuleIds.length,
  }
}
