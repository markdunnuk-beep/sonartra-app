import { createHash } from 'node:crypto'

import {
  compileAssessmentPackageV2,
  EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION,
  type ExecutableAssessmentPackageV2,
  type PackageCompileResult,
} from '@/lib/admin/domain/assessment-package-v2-compiler'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, type SonartraAssessmentPackageV2ValidatedImport } from '@/lib/admin/domain/assessment-package-v2'
import type { AssessmentResultRow } from '@/lib/assessment-types'
import type { V2PersistedEvaluationArtifact } from '@/lib/server/live-assessment-v2'

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

export interface CompiledRuntimeCacheEntry {
  cacheSchemaVersion: typeof PACKAGE_CONTRACT_V2_COMPILE_CACHE_SCHEMA_VERSION
  fingerprint: PackageRuntimeFingerprint
  compiledAt: string
  runtimeVersion: string
  executablePackage: ExecutableAssessmentPackageV2
}

export interface GetOrCompileRuntimeOptions {
  assessmentVersionId?: string | null
  schemaVersion?: string | null
  bypassCache?: boolean
  onDiagnostic?: (diagnostic: AssessmentPerformanceDiagnostic) => void
}

export interface GetOrCompileRuntimeResult extends PackageCompileResult {
  cache: {
    hit: boolean
    bypassed: boolean
    fingerprint: PackageRuntimeFingerprint
    compiledAt: string | null
  }
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function createPackageRuntimeFingerprint(
  pkg: SonartraAssessmentPackageV2ValidatedImport,
  options: { assessmentVersionId?: string | null; schemaVersion?: string | null } = {},
): PackageRuntimeFingerprint {
  const assessmentVersionId = options.assessmentVersionId ?? null
  const schemaVersion = options.schemaVersion ?? SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
  const packageFingerprint = createHash('sha256')
    .update(stableSerialize(pkg))
    .digest('hex')

  return {
    assessmentVersionId,
    packageFingerprint,
    schemaVersion,
    cacheKey: [PACKAGE_CONTRACT_V2_COMPILE_CACHE_SCHEMA_VERSION, schemaVersion, assessmentVersionId ?? 'unscoped', packageFingerprint].join(':'),
  }
}

function isCompiledRuntimeCacheEntry(value: unknown): value is CompiledRuntimeCacheEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Partial<CompiledRuntimeCacheEntry>
  return candidate.cacheSchemaVersion === PACKAGE_CONTRACT_V2_COMPILE_CACHE_SCHEMA_VERSION
    && typeof candidate.compiledAt === 'string'
    && candidate.runtimeVersion === EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION
    && Boolean(candidate.fingerprint?.cacheKey)
    && Boolean(candidate.executablePackage)
}

class CompiledRuntimeCache {
  private readonly entries = new Map<string, CompiledRuntimeCacheEntry>()

  get(cacheKey: string): CompiledRuntimeCacheEntry | null {
    const entry = this.entries.get(cacheKey)
    return isCompiledRuntimeCacheEntry(entry) ? entry : null
  }

  has(cacheKey: string): boolean {
    return this.entries.has(cacheKey)
  }

  set(entry: CompiledRuntimeCacheEntry) {
    this.entries.set(entry.fingerprint.cacheKey, entry)
  }

  delete(cacheKey: string) {
    this.entries.delete(cacheKey)
  }

  clear() {
    this.entries.clear()
  }

  corrupt(cacheKey: string, value: unknown) {
    this.entries.set(cacheKey, value as CompiledRuntimeCacheEntry)
  }
}

export const compiledRuntimeCache = new CompiledRuntimeCache()

function emitDiagnostic(
  options: GetOrCompileRuntimeOptions | undefined,
  diagnostic: AssessmentPerformanceDiagnostic,
) {
  options?.onDiagnostic?.(diagnostic)
}

export function getOrCompileRuntime(
  pkg: SonartraAssessmentPackageV2ValidatedImport,
  options: GetOrCompileRuntimeOptions = {},
): GetOrCompileRuntimeResult {
  const fingerprint = createPackageRuntimeFingerprint(pkg, options)
  const bypassed = options.bypassCache === true

  if (!bypassed) {
    const cached = compiledRuntimeCache.get(fingerprint.cacheKey)
    if (cached) {
      emitDiagnostic(options, {
        stage: 'compile_cache',
        event: 'hit',
        detail: 'Reused cached compiled Package Contract v2 runtime.',
        metadata: { cacheKey: fingerprint.cacheKey },
      })
      return {
        ok: true,
        executablePackage: cached.executablePackage,
        diagnostics: [],
        cache: {
          hit: true,
          bypassed: false,
          fingerprint,
          compiledAt: cached.compiledAt,
        },
      }
    }

    if (compiledRuntimeCache.get(fingerprint.cacheKey) === null && compiledRuntimeCache.has(fingerprint.cacheKey)) {
      emitDiagnostic(options, {
        stage: 'compile_cache',
        event: 'corrupt_entry',
        detail: 'Compile cache entry was corrupt or incompatible and will be ignored.',
        metadata: { cacheKey: fingerprint.cacheKey },
      })
      compiledRuntimeCache.delete(fingerprint.cacheKey)
    }
  }

  emitDiagnostic(options, {
    stage: 'compile_cache',
    event: bypassed ? 'bypass' : 'miss',
    detail: bypassed ? 'Compile cache bypass requested; compiling fresh runtime.' : 'Compile cache miss; compiling fresh runtime.',
    metadata: { cacheKey: fingerprint.cacheKey },
  })

  const compiled = compileAssessmentPackageV2(pkg)
  if (!compiled.ok || !compiled.executablePackage) {
    return {
      ...compiled,
      cache: {
        hit: false,
        bypassed,
        fingerprint,
        compiledAt: null,
      },
    }
  }

  const compiledAt = new Date().toISOString()
  if (!bypassed) {
    compiledRuntimeCache.set({
      cacheSchemaVersion: PACKAGE_CONTRACT_V2_COMPILE_CACHE_SCHEMA_VERSION,
      fingerprint,
      compiledAt,
      runtimeVersion: compiled.executablePackage.runtimeVersion,
      executablePackage: compiled.executablePackage,
    })
  }

  return {
    ...compiled,
    cache: {
      hit: false,
      bypassed,
      fingerprint,
      compiledAt,
    },
  }
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
