import { EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION, type ExecutableAssessmentPackageV2, type PackageCompileDiagnostic } from '@/lib/admin/domain/assessment-package-v2-compiler'
import type { SonartraAssessmentPackageValidationIssue } from '@/lib/admin/domain/assessment-package'

export const SONARTRA_RUNTIME_CONTRACT_V2 = EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION

export interface RuntimeContractV2ValidationResult {
  ok: boolean
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
  normalizedRuntimePackage: ExecutableAssessmentPackageV2 | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pushIssue(collection: SonartraAssessmentPackageValidationIssue[], path: string, message: string) {
  collection.push({ path, message })
}

export function isRuntimeContractV2Payload(input: unknown): input is ExecutableAssessmentPackageV2 {
  return isRecord(input) && input.runtimeVersion === SONARTRA_RUNTIME_CONTRACT_V2
}

export function validateRuntimeContractV2(input: unknown): RuntimeContractV2ValidationResult {
  const errors: SonartraAssessmentPackageValidationIssue[] = []
  const warnings: SonartraAssessmentPackageValidationIssue[] = []

  if (!isRecord(input)) {
    return {
      ok: false,
      errors: [{ path: 'package', message: 'Runtime contract payload must be a JSON object.' }],
      warnings,
      normalizedRuntimePackage: null,
    }
  }

  if (input.runtimeVersion !== SONARTRA_RUNTIME_CONTRACT_V2) {
    pushIssue(errors, 'runtimeVersion', `Runtime contract must declare ${SONARTRA_RUNTIME_CONTRACT_V2}.`)
  }

  if (!isRecord(input.metadata)) {
    pushIssue(errors, 'metadata', 'Runtime contract metadata block is required.')
  }

  if (!isRecord(input.executionPlan)) {
    pushIssue(errors, 'executionPlan', 'Runtime contract executionPlan block is required.')
  }

  if (!isRecord(input.questionsById) || Object.keys(input.questionsById).length === 0) {
    pushIssue(errors, 'questionsById', 'Runtime contract must declare at least one question node.')
  }

  if (!isRecord(input.dimensionsById) || Object.keys(input.dimensionsById).length === 0) {
    pushIssue(errors, 'dimensionsById', 'Runtime contract must declare at least one raw dimension node.')
  }

  if (!isRecord(input.responseModels)) {
    pushIssue(errors, 'responseModels', 'Runtime contract response model graph is required.')
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalizedRuntimePackage: errors.length === 0 ? input as unknown as ExecutableAssessmentPackageV2 : null,
  }
}

export function compileCanonicalToRuntimeContractV2DiagnosticsToIssues(
  diagnostics: PackageCompileDiagnostic[],
): { errors: SonartraAssessmentPackageValidationIssue[]; warnings: SonartraAssessmentPackageValidationIssue[] } {
  return {
    errors: diagnostics
      .filter((entry) => entry.severity === 'error')
      .map((entry) => ({ path: entry.path, message: `[${entry.code}] ${entry.message}` })),
    warnings: diagnostics
      .filter((entry) => entry.severity === 'warning')
      .map((entry) => ({ path: entry.path, message: `[${entry.code}] ${entry.message}` })),
  }
}
