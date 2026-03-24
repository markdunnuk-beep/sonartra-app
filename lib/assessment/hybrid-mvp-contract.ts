export const HYBRID_MVP_CONTRACT_VERSION = 'hybrid_mvp_v1' as const

/**
 * Platform-standard execution profile for MVP.
 *
 * These values are intentionally closed so assessment packages cannot redefine
 * scoring, normalisation, output orchestration, or aggregation storage shape.
 */
export const HYBRID_MVP_PLATFORM_PROFILE = {
  executionModel: 'fixed_pipeline',
  scoringStrategy: 'deterministic_signal_weight_sum',
  normalisationStrategy: 'shared_min_max_0_100',
  outputPipeline: 'templated_narrative_blocks_v1',
  aggregationStorage: 'signal_domain_vectors_v1',
} as const

export type HybridMvpAssessmentCategory = 'individual' | 'team' | 'organisation'

export type HybridMvpAssessmentType =
  | 'baseline_signals'
  | 'follow_on_diagnostic'
  | 'pulse_check'

export type HybridMvpAssessmentPublishStatus =
  | 'draft'
  | 'ready_for_review'
  | 'published'
  | 'retired'

export type HybridMvpQuestionType = 'single_select'

export type HybridMvpAudience = 'individual' | 'team' | 'organisation'

export interface HybridMvpAssessmentIdentity {
  assessmentId: string
  assessmentKey: string
  slug: string
  title: string
  subtitle?: string | null
  summary?: string | null
  category: HybridMvpAssessmentCategory
  assessmentType: HybridMvpAssessmentType
  tags?: string[]
}

export interface HybridMvpAssessmentVersionMetadata {
  assessmentVersionId: string
  versionKey: string
  semanticVersion: string
  publishStatus: HybridMvpAssessmentPublishStatus
  isAssignmentEligible: boolean
  releaseDate?: string | null
  authoredBy?: string | null
  changeSummary?: string | null
}

export interface HybridMvpDomainDefinition {
  domainKey: string
  label: string
  shortLabel?: string | null
  description?: string | null
  reportOrder: number
  audience: HybridMvpAudience
}

export interface HybridMvpSignalDefinition {
  signalKey: string
  label: string
  shortLabel?: string | null
  description?: string | null
  domainKey: string
  reportOrder: number
  aggregationKey: string
}

export interface HybridMvpQuestionOption {
  optionId: string
  value: number
  label: string
  helpText?: string | null
  displayOrder: number
}

export interface HybridMvpOptionSignalWeight {
  signalKey: string
  weight: number
}

export interface HybridMvpQuestionDefinition {
  questionId: string
  questionKey: string
  prompt: string
  helpText?: string | null
  questionType: HybridMvpQuestionType
  displayOrder: number
  options: HybridMvpQuestionOption[]
  optionSignalWeights: Record<string, HybridMvpOptionSignalWeight[]>
}

export interface HybridMvpNarrativeTemplateBlock {
  blockKey: string
  audience: HybridMvpAudience
  title: string
  bodyTemplate: string
  displayOrder: number
}

export interface HybridMvpAssessmentOutputTemplates {
  reportTitleTemplate: string
  reportSubtitleTemplate?: string | null
  narrativeBlocks: HybridMvpNarrativeTemplateBlock[]
  recommendationsTemplate?: string | null
}

/**
 * Configurable content authored per assessment/version.
 */
export interface HybridMvpAssessmentConfiguration {
  domains: HybridMvpDomainDefinition[]
  signals: HybridMvpSignalDefinition[]
  questions: HybridMvpQuestionDefinition[]
  outputTemplates: HybridMvpAssessmentOutputTemplates
}

/**
 * Platform-bound execution contract. These fields are references only and must
 * map to Sonartra-owned deterministic implementations.
 */
export interface HybridMvpPlatformBinding {
  contractVersion: typeof HYBRID_MVP_CONTRACT_VERSION
  executionModel: typeof HYBRID_MVP_PLATFORM_PROFILE.executionModel
  scoringStrategy: typeof HYBRID_MVP_PLATFORM_PROFILE.scoringStrategy
  normalisationStrategy: typeof HYBRID_MVP_PLATFORM_PROFILE.normalisationStrategy
  outputPipeline: typeof HYBRID_MVP_PLATFORM_PROFILE.outputPipeline
  aggregationStorage: typeof HYBRID_MVP_PLATFORM_PROFILE.aggregationStorage
}

export interface HybridMvpAssessmentContract {
  identity: HybridMvpAssessmentIdentity
  version: HybridMvpAssessmentVersionMetadata
  platform: HybridMvpPlatformBinding
  configuration: HybridMvpAssessmentConfiguration
}

/**
 * Future extension boundaries for hybrid MVP.
 *
 * Explicitly deferred:
 * - arbitrary predicates/rules
 * - package-provided executable scripting
 * - free-form dependency graphs for derived outputs
 * - per-package normalisation formulas
 * - contradiction engines
 */
export interface HybridMvpDeferredRuntimeExtensionBoundary {
  allowArbitraryPredicateEvaluation: false
  allowPackageDefinedExecutableRules: false
  allowDynamicRuntimeExpressions: false
  allowCustomNormalisationDefinitions: false
  allowGeneralPurposeContradictionEngines: false
}

export const HYBRID_MVP_DEFERRED_RUNTIME_BOUNDARY: HybridMvpDeferredRuntimeExtensionBoundary = {
  allowArbitraryPredicateEvaluation: false,
  allowPackageDefinedExecutableRules: false,
  allowDynamicRuntimeExpressions: false,
  allowCustomNormalisationDefinitions: false,
  allowGeneralPurposeContradictionEngines: false,
}

export function createHybridMvpPlatformBinding(): HybridMvpPlatformBinding {
  return {
    contractVersion: HYBRID_MVP_CONTRACT_VERSION,
    executionModel: HYBRID_MVP_PLATFORM_PROFILE.executionModel,
    scoringStrategy: HYBRID_MVP_PLATFORM_PROFILE.scoringStrategy,
    normalisationStrategy: HYBRID_MVP_PLATFORM_PROFILE.normalisationStrategy,
    outputPipeline: HYBRID_MVP_PLATFORM_PROFILE.outputPipeline,
    aggregationStorage: HYBRID_MVP_PLATFORM_PROFILE.aggregationStorage,
  }
}
