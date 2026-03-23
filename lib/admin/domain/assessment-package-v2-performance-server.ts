import 'server-only'

import { createHash } from 'node:crypto'

import {
  compileAssessmentPackageV2,
  EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION,
  type ExecutableAssessmentPackageV2,
  type PackageCompileResult,
} from '@/lib/admin/domain/assessment-package-v2-compiler'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, type SonartraAssessmentPackageV2ValidatedImport } from '@/lib/admin/domain/assessment-package-v2'
import {
  PACKAGE_CONTRACT_V2_COMPILE_CACHE_SCHEMA_VERSION,
  type AssessmentPerformanceDiagnostic,
  type PackageRuntimeFingerprint,
} from '@/lib/admin/domain/assessment-package-v2-performance'

export * from '@/lib/admin/domain/assessment-package-v2-performance'

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
