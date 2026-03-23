import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1, validateSonartraAssessmentPackage, type AssessmentPackageStatus, type SonartraAssessmentPackageSummary, type SonartraAssessmentPackageValidationIssue } from '@/lib/admin/domain/assessment-package'
import { compileAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, validateSonartraAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2'

export type AdminAssessmentPackageDetectedVersion = 'legacy_v1' | 'package_contract_v2' | 'unknown'

export interface AdminAssessmentPackageReadinessFlags {
  structurallyValid: boolean
  importable: boolean
  compilable: boolean
  evaluatable: boolean
  simulatable: boolean
  runtimeExecutable: boolean
  liveRuntimeEnabled: boolean
  publishable: boolean
}

export interface AdminAssessmentPackageValidationSummary {
  success: boolean
  detectedVersion: AdminAssessmentPackageDetectedVersion
  schemaVersion: string | null
  packageName: string | null
  versionLabel: string | null
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
  summary: SonartraAssessmentPackageSummary | null
  readiness: AdminAssessmentPackageReadinessFlags
}

export interface PackageVersionDetectionResult {
  detectedVersion: AdminAssessmentPackageDetectedVersion
  schemaVersion: string | null
  packageName: string | null
  versionLabel: string | null
}

export interface ImportedAssessmentPackageResult {
  detectedVersion: AdminAssessmentPackageDetectedVersion
  schemaVersion: string | null
  packageName: string | null
  versionLabel: string | null
  packageStatus: AssessmentPackageStatus
  validationStatus: AssessmentPackageStatus
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
  summary: SonartraAssessmentPackageSummary | null
  readiness: AdminAssessmentPackageReadinessFlags
  definitionPayload: unknown | null
  validationSummary: AdminAssessmentPackageValidationSummary
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function buildGenericSummary(input: Partial<SonartraAssessmentPackageSummary> & {
  packageName?: string | null
  versionLabel?: string | null
  assessmentKey?: string | null
  sectionCount?: number
  derivedDimensionCount?: number
  responseModelCount?: number
  transformCount?: number
  integrityRuleCount?: number
}): SonartraAssessmentPackageSummary {
  return {
    dimensionsCount: typeof input.dimensionsCount === 'number' ? input.dimensionsCount : 0,
    questionsCount: typeof input.questionsCount === 'number' ? input.questionsCount : 0,
    optionsCount: typeof input.optionsCount === 'number' ? input.optionsCount : 0,
    scoringRuleCount: typeof input.scoringRuleCount === 'number' ? input.scoringRuleCount : 0,
    normalizationRuleCount: typeof input.normalizationRuleCount === 'number' ? input.normalizationRuleCount : 0,
    outputRuleCount: typeof input.outputRuleCount === 'number' ? input.outputRuleCount : 0,
    localeCount: typeof input.localeCount === 'number' ? input.localeCount : 0,
    packageName: input.packageName ?? null,
    versionLabel: input.versionLabel ?? null,
    assessmentKey: input.assessmentKey ?? null,
    sectionCount: typeof input.sectionCount === 'number' ? input.sectionCount : 0,
    derivedDimensionCount: typeof input.derivedDimensionCount === 'number' ? input.derivedDimensionCount : 0,
    responseModelCount: typeof input.responseModelCount === 'number' ? input.responseModelCount : 0,
    transformCount: typeof input.transformCount === 'number' ? input.transformCount : 0,
    integrityRuleCount: typeof input.integrityRuleCount === 'number' ? input.integrityRuleCount : 0,
  }
}

function buildValidationSummary(input: Omit<ImportedAssessmentPackageResult, 'validationSummary'>): AdminAssessmentPackageValidationSummary {
  return {
    success: input.packageStatus === 'valid' || input.packageStatus === 'valid_with_warnings',
    detectedVersion: input.detectedVersion,
    schemaVersion: input.schemaVersion,
    packageName: input.packageName,
    versionLabel: input.versionLabel,
    errors: input.errors,
    warnings: input.warnings,
    summary: input.summary,
    readiness: input.readiness,
  }
}

function withValidationSummary(input: Omit<ImportedAssessmentPackageResult, 'validationSummary'>): ImportedAssessmentPackageResult {
  return {
    ...input,
    validationSummary: buildValidationSummary(input),
  }
}

export function detectAssessmentPackageVersion(input: unknown): PackageVersionDetectionResult {
  if (!isRecord(input)) {
    return { detectedVersion: 'unknown', schemaVersion: null, packageName: null, versionLabel: null }
  }

  const topLevelSchemaVersion = asTrimmedString(input.schemaVersion)
  if (input.packageVersion === '2' || topLevelSchemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
    const metadata = isRecord(input.metadata) ? input.metadata : null
    const compatibility = metadata && isRecord(metadata.compatibility) ? metadata.compatibility : null
    return {
      detectedVersion: 'package_contract_v2',
      schemaVersion: topLevelSchemaVersion,
      packageName: metadata ? asTrimmedString(metadata.assessmentName) : null,
      versionLabel: compatibility ? asTrimmedString(compatibility.packageSemver) : null,
    }
  }

  const meta = isRecord(input.meta) ? input.meta : null
  const metaSchemaVersion = meta ? asTrimmedString(meta.schemaVersion) : null
  if (metaSchemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1) {
    return {
      detectedVersion: 'legacy_v1',
      schemaVersion: metaSchemaVersion,
      packageName: meta ? asTrimmedString(meta.assessmentTitle) : null,
      versionLabel: meta ? asTrimmedString(meta.versionLabel) : null,
    }
  }

  return {
    detectedVersion: 'unknown',
    schemaVersion: topLevelSchemaVersion ?? metaSchemaVersion,
    packageName: (meta ? asTrimmedString(meta.assessmentTitle) : null) ?? (isRecord(input.metadata) ? asTrimmedString(input.metadata.assessmentName) : null),
    versionLabel: (meta ? asTrimmedString(meta.versionLabel) : null) ?? (isRecord(input.metadata) && isRecord(input.metadata.compatibility) ? asTrimmedString(input.metadata.compatibility.packageSemver) : null),
  }
}

export function importAssessmentPackagePayload(input: unknown): ImportedAssessmentPackageResult {
  const detected = detectAssessmentPackageVersion(input)
  console.info('[admin-assessment-import] Detected package payload version.', {
    detectedVersion: detected.detectedVersion,
    schemaVersion: detected.schemaVersion,
    packageName: detected.packageName,
    versionLabel: detected.versionLabel,
  })

  switch (detected.detectedVersion) {
    case 'legacy_v1': {
      const validation = validateSonartraAssessmentPackage(input)
      const readiness: AdminAssessmentPackageReadinessFlags = {
        structurallyValid: validation.ok,
        importable: validation.ok,
        compilable: validation.ok,
        evaluatable: validation.ok,
        simulatable: validation.ok,
        runtimeExecutable: validation.ok,
        liveRuntimeEnabled: validation.ok,
        publishable: validation.ok,
      }
      return withValidationSummary({
        detectedVersion: detected.detectedVersion,
        schemaVersion: validation.schemaVersion ?? detected.schemaVersion,
        packageName: validation.normalizedPackage?.meta.assessmentTitle ?? detected.packageName,
        versionLabel: validation.normalizedPackage?.meta.versionLabel ?? detected.versionLabel,
        packageStatus: validation.status,
        validationStatus: validation.status,
        errors: validation.errors,
        warnings: validation.warnings,
        summary: buildGenericSummary({
          ...validation.summary,
          packageName: validation.normalizedPackage?.meta.assessmentTitle ?? detected.packageName,
          versionLabel: validation.normalizedPackage?.meta.versionLabel ?? detected.versionLabel,
          assessmentKey: validation.normalizedPackage?.meta.assessmentKey ?? null,
        }),
        readiness,
        definitionPayload: validation.normalizedPackage,
      })
    }
    case 'package_contract_v2': {
      const validation = validateSonartraAssessmentPackageV2(input)
      const packageStatus: AssessmentPackageStatus = !validation.ok ? 'invalid' : validation.warnings.length > 0 ? 'valid_with_warnings' : 'valid'
      const compileResult = validation.normalizedPackage ? compileAssessmentPackageV2(validation.normalizedPackage) : null
      const readiness: AdminAssessmentPackageReadinessFlags = {
        structurallyValid: validation.ok,
        importable: validation.ok,
        compilable: Boolean(compileResult?.ok),
        evaluatable: Boolean(compileResult?.ok),
        simulatable: Boolean(compileResult?.ok),
        runtimeExecutable: false,
        liveRuntimeEnabled: false,
        publishable: false,
      }
      return withValidationSummary({
        detectedVersion: detected.detectedVersion,
        schemaVersion: validation.normalizedPackage?.schemaVersion ?? detected.schemaVersion ?? SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
        packageName: validation.normalizedPackage?.metadata.assessmentName ?? detected.packageName,
        versionLabel: validation.normalizedPackage?.metadata.compatibility.packageSemver ?? detected.versionLabel,
        packageStatus,
        validationStatus: packageStatus,
        errors: validation.errors,
        warnings: validation.warnings,
        summary: buildGenericSummary({
          questionsCount: validation.summary.questionCount,
          dimensionsCount: validation.summary.dimensionCount,
          optionsCount: 0,
          scoringRuleCount: validation.summary.transformCount,
          normalizationRuleCount: validation.summary.normalizationRuleCount,
          outputRuleCount: validation.summary.outputRuleCount,
          localeCount: validation.normalizedPackage?.metadata.locales.supportedLocales.length ?? 0,
          packageName: validation.normalizedPackage?.metadata.assessmentName ?? detected.packageName,
          versionLabel: validation.normalizedPackage?.metadata.compatibility.packageSemver ?? detected.versionLabel,
          assessmentKey: validation.normalizedPackage?.metadata.assessmentKey ?? null,
          sectionCount: validation.summary.sectionCount,
          derivedDimensionCount: validation.summary.derivedDimensionCount,
          responseModelCount: validation.summary.responseModelCount,
          transformCount: validation.summary.transformCount,
          integrityRuleCount: validation.summary.integrityRuleCount,
        }),
        readiness,
        definitionPayload: validation.normalizedPackage,
      })
    }
    default: {
      const errors: SonartraAssessmentPackageValidationIssue[] = [{
        path: 'schemaVersion',
        message: 'Unknown or unsupported package contract version. Upload a legacy/v1 package or a Package Contract v2 payload.',
      }]
      const result = withValidationSummary({
        detectedVersion: 'unknown',
        schemaVersion: detected.schemaVersion,
        packageName: detected.packageName,
        versionLabel: detected.versionLabel,
        packageStatus: 'invalid',
        validationStatus: 'invalid',
        errors,
        warnings: [],
        summary: buildGenericSummary({
          packageName: detected.packageName,
          versionLabel: detected.versionLabel,
        }),
        readiness: {
          structurallyValid: false,
          importable: false,
          compilable: false,
          evaluatable: false,
          simulatable: false,
          runtimeExecutable: false,
          liveRuntimeEnabled: false,
          publishable: false,
        },
        definitionPayload: null,
      })
      console.warn('[admin-assessment-import] Unsupported package contract version encountered.', {
        schemaVersion: detected.schemaVersion,
        packageName: detected.packageName,
      })
      return result
    }
  }
}
