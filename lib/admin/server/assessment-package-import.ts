import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1, validateSonartraAssessmentPackage, type AssessmentPackageStatus, type SonartraAssessmentPackageSummary, type SonartraAssessmentPackageValidationIssue } from '@/lib/admin/domain/assessment-package'
import { compileAssessmentPackageV2, type ExecutableAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import { compileRuntimeContractV2, compileRuntimeContractV2DiagnosticsToIssues, type CompiledRuntimePlanV2 } from '@/lib/admin/domain/runtime-plan-v2-compiler'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, validateSonartraAssessmentPackageV2, type SonartraAssessmentPackageV2ValidatedImport } from '@/lib/admin/domain/assessment-package-v2'
import { compileCanonicalToRuntimeContractV2DiagnosticsToIssues, isRuntimeContractV2Payload, SONARTRA_RUNTIME_CONTRACT_V2, validateRuntimeContractV2 } from '@/lib/admin/domain/package-runtime-v2'
import type { AssessmentImportConflict, AssessmentPackageIdentity } from '@/lib/admin/domain/assessment-management'

export type AdminAssessmentPackageDetectedVersion = 'legacy_v1' | 'package_contract_v2' | 'unknown'
export type AssessmentPackageContractClassifier = 'legacy_contract_v1' | 'canonical_contract_v2' | 'runtime_contract_v2' | 'unknown_or_invalid'

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
  analysis?: AdminAssessmentImportAnalysis
}

export interface PackageVersionDetectionResult {
  detectedVersion: AdminAssessmentPackageDetectedVersion
  classifier: AssessmentPackageContractClassifier
  schemaVersion: string | null
  packageName: string | null
  versionLabel: string | null
}

export type ImportReadinessSemantic =
  | 'structurally_invalid'
  | 'valid_with_warnings'
  | 'importable_not_publish_ready'
  | 'executable_ready'
  | 'authoring_valid_requires_compile'
  | 'unsupported_or_unknown'

export interface ImportDiagnosticCollection {
  canonicalValidation: SonartraAssessmentPackageValidationIssue[]
  compilation: SonartraAssessmentPackageValidationIssue[]
  runtimeValidation: SonartraAssessmentPackageValidationIssue[]
  planCompilation?: SonartraAssessmentPackageValidationIssue[]
  general: SonartraAssessmentPackageValidationIssue[]
}

export interface AdminAssessmentImportAnalysis {
  classifier: AssessmentPackageContractClassifier
  contractFamily: 'legacy' | 'canonical' | 'runtime' | 'unknown'
  packageVersion: '1' | '2' | null
  payloadKind: 'legacy_payload' | 'canonical_authoring_payload' | 'runtime_executable_payload' | 'unknown_payload'
  structurallyValid: boolean
  importable: boolean
  executableReady: boolean
  authoringOnly: boolean
  compileRequired: boolean
  compilePerformed: boolean
  compiledRuntimeArtifactProduced: boolean
  compiledRuntimePlanProduced?: boolean
  readinessSemantic: ImportReadinessSemantic
  diagnostics: ImportDiagnosticCollection
  compatibilityFlags: string[]
  compiledRuntimeArtifact: ExecutableAssessmentPackageV2 | null
  compiledRuntimePlan?: CompiledRuntimePlanV2 | null
}

export interface ImportedAssessmentPackageResult {
  detectedVersion: AdminAssessmentPackageDetectedVersion
  classifier: AssessmentPackageContractClassifier
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
  analysis: AdminAssessmentImportAnalysis
}

export interface AssessmentPackageIdentityExtractionResult {
  identity: AssessmentPackageIdentity | null
  conflicts: AssessmentImportConflict[]
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeSlug(value: string | null): string | null {
  if (!value) {
    return null
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || null
}

function normalizeCategory(value: string | null): string | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  return normalized || null
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

function statusFromIssues(errors: SonartraAssessmentPackageValidationIssue[], warnings: SonartraAssessmentPackageValidationIssue[]): AssessmentPackageStatus {
  if (errors.length > 0) {
    return 'invalid'
  }

  return warnings.length > 0 ? 'valid_with_warnings' : 'valid'
}

export function classifyPackageContract(input: unknown): PackageVersionDetectionResult {
  if (!isRecord(input)) {
    return { detectedVersion: 'unknown', classifier: 'unknown_or_invalid', schemaVersion: null, packageName: null, versionLabel: null }
  }

  if (isRuntimeContractV2Payload(input)) {
    const metadata = isRecord(input.metadata) ? input.metadata : null
    const compatibility = metadata && isRecord(metadata.compatibility) ? metadata.compatibility : null
    return {
      detectedVersion: 'package_contract_v2',
      classifier: 'runtime_contract_v2',
      schemaVersion: SONARTRA_RUNTIME_CONTRACT_V2,
      packageName: metadata ? asTrimmedString(metadata.assessmentName) : null,
      versionLabel: compatibility ? asTrimmedString(compatibility.packageSemver) : null,
    }
  }

  const topLevelSchemaVersion = asTrimmedString(input.schemaVersion)
  if (input.packageVersion === '2' || topLevelSchemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
    const metadata = isRecord(input.metadata) ? input.metadata : null
    const compatibility = metadata && isRecord(metadata.compatibility) ? metadata.compatibility : null
    const identity = isRecord(input.identity) ? input.identity : null
    return {
      detectedVersion: 'package_contract_v2',
      classifier: 'canonical_contract_v2',
      schemaVersion: topLevelSchemaVersion ?? SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
      packageName: (metadata ? asTrimmedString(metadata.assessmentName) : null) ?? (identity ? asTrimmedString(identity.title) : null),
      versionLabel: (compatibility ? asTrimmedString(compatibility.packageSemver) : null) ?? (identity ? asTrimmedString(identity.versionLabel) : null),
    }
  }

  const meta = isRecord(input.meta) ? input.meta : null
  const metaSchemaVersion = meta ? asTrimmedString(meta.schemaVersion) : null
  if (metaSchemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1) {
    return {
      detectedVersion: 'legacy_v1',
      classifier: 'legacy_contract_v1',
      schemaVersion: metaSchemaVersion,
      packageName: meta ? asTrimmedString(meta.assessmentTitle) : null,
      versionLabel: meta ? asTrimmedString(meta.versionLabel) : null,
    }
  }

  return {
    detectedVersion: 'unknown',
    classifier: 'unknown_or_invalid',
    schemaVersion: topLevelSchemaVersion ?? metaSchemaVersion,
    packageName: (meta ? asTrimmedString(meta.assessmentTitle) : null) ?? (isRecord(input.metadata) ? asTrimmedString(input.metadata.assessmentName) : null),
    versionLabel: (meta ? asTrimmedString(meta.versionLabel) : null) ?? (isRecord(input.metadata) && isRecord(input.metadata.compatibility) ? asTrimmedString(input.metadata.compatibility.packageSemver) : null),
  }
}

export const detectAssessmentPackageVersion = classifyPackageContract

interface ValidatedDetectedPackage {
  status: AssessmentPackageStatus
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
  summary: SonartraAssessmentPackageSummary
  definitionPayload: unknown | null
  canonicalPayload: SonartraAssessmentPackageV2ValidatedImport | null
  runtimePayload: ExecutableAssessmentPackageV2 | null
  diagnostics: ImportDiagnosticCollection
  compilePerformed: boolean
  compileRequired: boolean
  runtimePlan: CompiledRuntimePlanV2 | null
}

export function validateDetectedPackage(input: unknown, detected: PackageVersionDetectionResult): ValidatedDetectedPackage {
  if (detected.classifier === 'legacy_contract_v1') {
    const validation = validateSonartraAssessmentPackage(input)
    return {
      status: validation.status,
      errors: validation.errors,
      warnings: validation.warnings,
      summary: buildGenericSummary({
        ...validation.summary,
        packageName: validation.normalizedPackage?.meta.assessmentTitle ?? detected.packageName,
        versionLabel: validation.normalizedPackage?.meta.versionLabel ?? detected.versionLabel,
        assessmentKey: validation.normalizedPackage?.meta.assessmentKey ?? null,
      }),
      definitionPayload: validation.normalizedPackage,
      canonicalPayload: null,
      runtimePayload: null,
      diagnostics: {
        canonicalValidation: [],
        compilation: [],
        runtimeValidation: [],
        planCompilation: [],
        general: [...validation.errors, ...validation.warnings],
      },
      compilePerformed: false,
      compileRequired: false,
      runtimePlan: null,
    }
  }

  if (detected.classifier === 'canonical_contract_v2') {
    const canonicalValidation = validateSonartraAssessmentPackageV2(input)
    const diagnostics: ImportDiagnosticCollection = {
      canonicalValidation: [...canonicalValidation.errors, ...canonicalValidation.warnings],
      compilation: [],
      runtimeValidation: [],
      planCompilation: [],
      general: [],
    }

    let compileResult: ReturnType<typeof compileAssessmentPackageV2> | null = null
    let runtimeValidationErrors: SonartraAssessmentPackageValidationIssue[] = []
    let runtimeValidationWarnings: SonartraAssessmentPackageValidationIssue[] = []
    let compileErrors: SonartraAssessmentPackageValidationIssue[] = []
    let compileWarnings: SonartraAssessmentPackageValidationIssue[] = []
    let planCompileErrors: SonartraAssessmentPackageValidationIssue[] = []
    let planCompileWarnings: SonartraAssessmentPackageValidationIssue[] = []
    let runtimePlan: CompiledRuntimePlanV2 | null = null

    if (canonicalValidation.ok && canonicalValidation.normalizedPackage) {
      compileResult = compileAssessmentPackageV2(canonicalValidation.normalizedPackage)
      const compileDiagnostics = compileCanonicalToRuntimeContractV2DiagnosticsToIssues(compileResult.diagnostics)
      compileErrors = compileDiagnostics.errors
      compileWarnings = compileDiagnostics.warnings
      diagnostics.compilation = [...compileDiagnostics.errors, ...compileDiagnostics.warnings]

      if (compileResult.ok && compileResult.executablePackage) {
        const runtimeValidation = validateRuntimeContractV2(compileResult.executablePackage)
        runtimeValidationErrors = runtimeValidation.errors
        runtimeValidationWarnings = runtimeValidation.warnings
        diagnostics.runtimeValidation = [...runtimeValidation.errors, ...runtimeValidation.warnings]
        if (runtimeValidation.ok) {
          const planCompilation = compileRuntimeContractV2(compileResult.executablePackage)
          const planIssues = compileRuntimeContractV2DiagnosticsToIssues(planCompilation.diagnostics)
          planCompileErrors = planIssues.errors
          planCompileWarnings = planIssues.warnings
          diagnostics.planCompilation = [...planCompileErrors, ...planCompileWarnings]
          runtimePlan = planCompilation.compiledPlan
        }
      }
    }

    const errors = [
      ...canonicalValidation.errors,
      ...compileErrors,
      ...runtimeValidationErrors,
      ...planCompileErrors,
    ]

    const warnings = [
      ...canonicalValidation.warnings,
      ...compileWarnings,
      ...runtimeValidationWarnings,
      ...planCompileWarnings,
    ]

    return {
      status: statusFromIssues(errors, warnings),
      errors,
      warnings,
      summary: buildGenericSummary({
        questionsCount: canonicalValidation.summary.questionCount,
        dimensionsCount: canonicalValidation.summary.dimensionCount,
        optionsCount: 0,
        scoringRuleCount: canonicalValidation.summary.transformCount,
        normalizationRuleCount: canonicalValidation.summary.normalizationRuleCount,
        outputRuleCount: canonicalValidation.summary.outputRuleCount,
        localeCount: canonicalValidation.normalizedPackage?.metadata.locales.supportedLocales.length ?? 0,
        packageName: canonicalValidation.normalizedPackage?.metadata.assessmentName ?? detected.packageName,
        versionLabel: canonicalValidation.normalizedPackage?.metadata.compatibility.packageSemver ?? detected.versionLabel,
        assessmentKey: canonicalValidation.normalizedPackage?.metadata.assessmentKey ?? null,
        sectionCount: canonicalValidation.summary.sectionCount,
        derivedDimensionCount: canonicalValidation.summary.derivedDimensionCount,
        responseModelCount: canonicalValidation.summary.responseModelCount,
        transformCount: canonicalValidation.summary.transformCount,
        integrityRuleCount: canonicalValidation.summary.integrityRuleCount,
      }),
      definitionPayload: canonicalValidation.normalizedPackage,
      canonicalPayload: canonicalValidation.normalizedPackage,
      runtimePayload: compileResult?.ok ? compileResult.executablePackage : null,
      diagnostics,
      compilePerformed: Boolean(canonicalValidation.ok && canonicalValidation.normalizedPackage),
      compileRequired: true,
      runtimePlan,
    }
  }

  if (detected.classifier === 'runtime_contract_v2') {
    const runtimeValidation = validateRuntimeContractV2(input)
    const planCompilation = runtimeValidation.ok && runtimeValidation.normalizedRuntimePackage
      ? compileRuntimeContractV2(runtimeValidation.normalizedRuntimePackage)
      : null
    const planIssues = compileRuntimeContractV2DiagnosticsToIssues(planCompilation?.diagnostics ?? [])
    const errors = [...runtimeValidation.errors, ...planIssues.errors]
    const warnings = [...runtimeValidation.warnings, ...planIssues.warnings]

    return {
      status: statusFromIssues(errors, warnings),
      errors,
      warnings,
      summary: buildGenericSummary({
        questionsCount: runtimeValidation.normalizedRuntimePackage ? Object.keys(runtimeValidation.normalizedRuntimePackage.questionsById).length : 0,
        dimensionsCount: runtimeValidation.normalizedRuntimePackage ? Object.keys(runtimeValidation.normalizedRuntimePackage.dimensionsById).length : 0,
        packageName: runtimeValidation.normalizedRuntimePackage?.metadata.assessmentName ?? detected.packageName,
        versionLabel: runtimeValidation.normalizedRuntimePackage?.metadata.compatibility.packageSemver ?? detected.versionLabel,
        assessmentKey: runtimeValidation.normalizedRuntimePackage?.metadata.assessmentKey ?? null,
      }),
      definitionPayload: runtimeValidation.normalizedRuntimePackage,
      canonicalPayload: null,
      runtimePayload: runtimeValidation.normalizedRuntimePackage,
      diagnostics: {
        canonicalValidation: [],
        compilation: [],
        planCompilation: [...planIssues.errors, ...planIssues.warnings],
        runtimeValidation: [...runtimeValidation.errors, ...runtimeValidation.warnings],
        general: [],
      },
      compilePerformed: false,
      compileRequired: false,
      runtimePlan: planCompilation?.compiledPlan ?? null,
    }
  }

  const errors: SonartraAssessmentPackageValidationIssue[] = [{
    path: 'schemaVersion',
    message: 'Unknown or unsupported package contract version. Upload a legacy/v1 package, canonical Package Contract v2 payload, or runtime contract v2 payload.',
  }]

  return {
    status: 'invalid',
    errors,
    warnings: [],
    summary: buildGenericSummary({ packageName: detected.packageName, versionLabel: detected.versionLabel }),
    definitionPayload: null,
    canonicalPayload: null,
    runtimePayload: null,
    diagnostics: {
      canonicalValidation: [],
      compilation: [],
      runtimeValidation: [],
      planCompilation: [],
      general: errors,
    },
    compilePerformed: false,
    compileRequired: false,
    runtimePlan: null,
  }
}

export function summarizeImportReadiness(input: {
  classifier: AssessmentPackageContractClassifier
  validationStatus: AssessmentPackageStatus
  compileRequired: boolean
  compilePerformed: boolean
  runtimeArtifactProduced: boolean
}): { readiness: AdminAssessmentPackageReadinessFlags; semantic: ImportReadinessSemantic; executableReady: boolean; authoringOnly: boolean } {
  const structurallyValid = input.validationStatus === 'valid' || input.validationStatus === 'valid_with_warnings'
  const importable = structurallyValid

  if (!importable) {
    return {
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
      semantic: input.classifier === 'unknown_or_invalid' ? 'unsupported_or_unknown' : 'structurally_invalid',
      executableReady: false,
      authoringOnly: input.classifier === 'canonical_contract_v2',
    }
  }

  if (input.classifier === 'runtime_contract_v2') {
    return {
      readiness: {
        structurallyValid: true,
        importable: true,
        compilable: false,
        evaluatable: true,
        simulatable: true,
        runtimeExecutable: true,
        liveRuntimeEnabled: true,
        publishable: false,
      },
      semantic: input.validationStatus === 'valid_with_warnings' ? 'valid_with_warnings' : 'executable_ready',
      executableReady: true,
      authoringOnly: false,
    }
  }

  if (input.classifier === 'canonical_contract_v2') {
    if (input.runtimeArtifactProduced) {
      return {
        readiness: {
          structurallyValid: true,
          importable: true,
          compilable: input.compilePerformed,
          evaluatable: true,
          simulatable: true,
          runtimeExecutable: false,
          liveRuntimeEnabled: false,
          publishable: false,
        },
        semantic: input.validationStatus === 'valid_with_warnings' ? 'valid_with_warnings' : 'importable_not_publish_ready',
        executableReady: false,
        authoringOnly: true,
      }
    }

    return {
      readiness: {
        structurallyValid: true,
        importable: true,
        compilable: false,
        evaluatable: false,
        simulatable: false,
        runtimeExecutable: false,
        liveRuntimeEnabled: false,
        publishable: false,
      },
      semantic: 'authoring_valid_requires_compile',
      executableReady: false,
      authoringOnly: true,
    }
  }

  return {
    readiness: {
      structurallyValid: true,
      importable: true,
      compilable: false,
      evaluatable: false,
      simulatable: false,
      runtimeExecutable: false,
      liveRuntimeEnabled: false,
      publishable: false,
    },
    semantic: input.validationStatus === 'valid_with_warnings' ? 'valid_with_warnings' : 'importable_not_publish_ready',
    executableReady: false,
    authoringOnly: false,
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
    analysis: input.analysis,
  }
}

function withValidationSummary(input: Omit<ImportedAssessmentPackageResult, 'validationSummary'>): ImportedAssessmentPackageResult {
  return {
    ...input,
    validationSummary: buildValidationSummary(input),
  }
}

export function analyzePackageForImport(input: unknown): ImportedAssessmentPackageResult {
  const detected = classifyPackageContract(input)
  const validated = validateDetectedPackage(input, detected)
  const readiness = summarizeImportReadiness({
    classifier: detected.classifier,
    validationStatus: validated.status,
    compileRequired: validated.compileRequired,
    compilePerformed: validated.compilePerformed,
    runtimeArtifactProduced: Boolean(validated.runtimePayload),
  })

  const packageName = detected.classifier === 'legacy_contract_v1'
    ? (isRecord(validated.definitionPayload) && isRecord(validated.definitionPayload.meta) ? asTrimmedString(validated.definitionPayload.meta.assessmentTitle) : null) ?? detected.packageName
    : (validated.canonicalPayload?.metadata.assessmentName ?? validated.runtimePayload?.metadata.assessmentName ?? detected.packageName)

  const versionLabel = detected.classifier === 'legacy_contract_v1'
    ? (isRecord(validated.definitionPayload) && isRecord(validated.definitionPayload.meta) ? asTrimmedString(validated.definitionPayload.meta.versionLabel) : null) ?? detected.versionLabel
    : (validated.canonicalPayload?.metadata.compatibility.packageSemver ?? validated.runtimePayload?.metadata.compatibility.packageSemver ?? detected.versionLabel)

  const analysis: AdminAssessmentImportAnalysis = {
    classifier: detected.classifier,
    contractFamily: detected.classifier === 'legacy_contract_v1'
      ? 'legacy'
      : detected.classifier === 'canonical_contract_v2'
        ? 'canonical'
        : detected.classifier === 'runtime_contract_v2'
          ? 'runtime'
          : 'unknown',
    packageVersion: detected.classifier === 'legacy_contract_v1' ? '1' : detected.classifier === 'unknown_or_invalid' ? null : '2',
    payloadKind: detected.classifier === 'legacy_contract_v1'
      ? 'legacy_payload'
      : detected.classifier === 'canonical_contract_v2'
        ? 'canonical_authoring_payload'
        : detected.classifier === 'runtime_contract_v2'
          ? 'runtime_executable_payload'
          : 'unknown_payload',
    structurallyValid: readiness.readiness.structurallyValid,
    importable: readiness.readiness.importable,
    executableReady: readiness.executableReady,
    authoringOnly: readiness.authoringOnly,
    compileRequired: validated.compileRequired,
    compilePerformed: validated.compilePerformed,
    compiledRuntimeArtifactProduced: Boolean(validated.runtimePayload),
    compiledRuntimePlanProduced: Boolean(validated.runtimePlan),
    readinessSemantic: readiness.semantic,
    diagnostics: validated.diagnostics,
    compatibilityFlags: [
      ...(detected.classifier === 'runtime_contract_v2' ? ['runtime_payload_upload'] : []),
      ...(detected.classifier === 'canonical_contract_v2' && !validated.runtimePayload ? ['canonical_compile_incomplete'] : []),
    ],
    compiledRuntimeArtifact: validated.runtimePayload,
    compiledRuntimePlan: validated.runtimePlan,
  }

  return withValidationSummary({
    detectedVersion: detected.detectedVersion,
    classifier: detected.classifier,
    schemaVersion: detected.classifier === 'runtime_contract_v2'
      ? SONARTRA_RUNTIME_CONTRACT_V2
      : detected.classifier === 'canonical_contract_v2'
        ? validated.canonicalPayload?.schemaVersion ?? detected.schemaVersion ?? SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
        : detected.schemaVersion,
    packageName,
    versionLabel,
    packageStatus: validated.status,
    validationStatus: validated.status,
    errors: validated.errors,
    warnings: validated.warnings,
    summary: validated.summary,
    readiness: readiness.readiness,
    definitionPayload: validated.definitionPayload,
    analysis,
  })
}

export const importAssessmentPackagePayload = analyzePackageForImport

export function extractAssessmentPackageIdentity(
  input: unknown,
  importedPackage: ImportedAssessmentPackageResult | null = null,
): AssessmentPackageIdentityExtractionResult {
  const imported = importedPackage ?? importAssessmentPackagePayload(input)
  const conflicts: AssessmentImportConflict[] = []

  if (!isRecord(input)) {
    return {
      identity: null,
      conflicts: [{
        code: 'missing_identity_metadata',
        severity: 'error',
        message: 'Package identity could not be extracted because the payload is not a JSON object.',
      }],
    }
  }

  if (imported.detectedVersion === 'legacy_v1') {
    const meta = isRecord(input.meta) ? input.meta : {}
    const assessmentKey = asTrimmedString(meta.assessmentKey)
    const assessmentName = asTrimmedString(meta.assessmentTitle)
    const explicitSlug = normalizeSlug(asTrimmedString((meta as Record<string, unknown>).slug) ?? asTrimmedString(input.slug))
    const explicitCategory = normalizeCategory(asTrimmedString((meta as Record<string, unknown>).category) ?? asTrimmedString(input.category))
    const derivedFields: Array<'slug' | 'category'> = []

    if (!assessmentKey) {
      conflicts.push({
        code: 'missing_identity_metadata',
        severity: 'error',
        field: 'assessmentKey',
        message: 'Package identity is missing the required assessment key.',
      })
    }

    if (!assessmentName) {
      conflicts.push({
        code: 'missing_identity_metadata',
        severity: 'error',
        field: 'assessmentName',
        message: 'Package identity is missing the required assessment name.',
      })
    }

    const slug = explicitSlug ?? normalizeSlug(assessmentKey ?? assessmentName ?? null)
    if (!explicitSlug && slug) {
      derivedFields.push('slug')
      conflicts.push({
        code: 'identity_metadata_changed',
        severity: 'warning',
        field: 'slug',
        message: 'The package does not declare a slug, so the review generated one from the package identity for backward compatibility.',
      })
    }

    const category = explicitCategory ?? 'other'
    if (!explicitCategory) {
      derivedFields.push('category')
      conflicts.push({
        code: 'identity_metadata_changed',
        severity: 'warning',
        field: 'category',
        message: 'The package does not declare a category, so the review defaulted the category to other for backward compatibility.',
      })
    }

    if (!assessmentKey || !assessmentName || !slug) {
      return { identity: null, conflicts }
    }

    const language = isRecord(input.language) ? input.language : {}
    const locales = Array.isArray(language.locales)
      ? language.locales.flatMap((entry) => isRecord(entry) ? [asTrimmedString(entry.locale)] : []).filter((locale): locale is string => Boolean(locale))
      : []

    return {
      identity: {
        assessmentKey,
        assessmentName,
        slug,
        category,
        description: asTrimmedString(input.description),
        defaultLocale: asTrimmedString(meta.defaultLocale),
        supportedLocales: locales,
        assessmentType: asTrimmedString((meta as Record<string, unknown>).assessmentType),
        authorName: null,
        authorSource: null,
        versionLabel: asTrimmedString(meta.versionLabel),
        schemaVersion: imported.schemaVersion,
        detectedVersion: imported.detectedVersion,
        derivedFields,
      },
      conflicts,
    }
  }

  if (imported.detectedVersion === 'package_contract_v2') {
    const metadata = isRecord(input.metadata) ? input.metadata : (isRecord(imported.definitionPayload) && isRecord(imported.definitionPayload.metadata) ? imported.definitionPayload.metadata : {})
    const locales = isRecord(metadata.locales) ? metadata.locales : {}
    const authoring = isRecord(metadata.authoring) ? metadata.authoring : {}
    const compatibility = isRecord(metadata.compatibility) ? metadata.compatibility : {}
    const assessmentKey = asTrimmedString(metadata.assessmentKey)
    const assessmentName = asTrimmedString(metadata.assessmentName)
    const explicitSlug = normalizeSlug(asTrimmedString((metadata as Record<string, unknown>).slug))
    const explicitCategory = normalizeCategory(asTrimmedString((metadata as Record<string, unknown>).category))
    const derivedFields: Array<'slug' | 'category'> = []

    if (!assessmentKey) {
      conflicts.push({
        code: 'missing_identity_metadata',
        severity: 'error',
        field: 'assessmentKey',
        message: 'Package identity is missing the required assessment key.',
      })
    }

    if (!assessmentName) {
      conflicts.push({
        code: 'missing_identity_metadata',
        severity: 'error',
        field: 'assessmentName',
        message: 'Package identity is missing the required assessment name.',
      })
    }

    const slug = explicitSlug

    const category = explicitCategory ?? null

    if (!assessmentKey || !assessmentName || !slug || !category) {
      if (!slug) {
        conflicts.push({
          code: 'missing_identity_metadata',
          severity: 'error',
          field: 'slug',
          message: 'Package identity is missing the required slug for the package-first import path.',
        })
      }
      if (!category) {
        conflicts.push({
          code: 'missing_identity_metadata',
          severity: 'error',
          field: 'category',
          message: 'Package identity is missing the required category for the package-first import path.',
        })
      }
      return { identity: null, conflicts }
    }

    return {
      identity: {
        assessmentKey,
        assessmentName,
        slug,
        category,
        description: asTrimmedString(metadata.description),
        defaultLocale: asTrimmedString((locales as Record<string, unknown>).defaultLocale),
        supportedLocales: Array.isArray((locales as Record<string, unknown>).supportedLocales)
          ? ((locales as Record<string, unknown>).supportedLocales as unknown[])
              .flatMap((locale) => asTrimmedString(locale))
              .filter((locale): locale is string => Boolean(locale))
          : [],
        assessmentType: Array.isArray(metadata.tags) ? asTrimmedString(metadata.tags[0]) : null,
        authorName: asTrimmedString(authoring.author) ?? asTrimmedString(authoring.organization),
        authorSource: asTrimmedString(authoring.source),
        versionLabel: asTrimmedString(compatibility.packageSemver),
        schemaVersion: imported.schemaVersion,
        detectedVersion: imported.detectedVersion,
        derivedFields,
      },
      conflicts,
    }
  }

  return {
    identity: null,
    conflicts: [{
      code: 'missing_identity_metadata',
      severity: 'error',
      message: 'Package identity could not be extracted because the uploaded payload does not match a supported contract version.',
    }],
  }
}
