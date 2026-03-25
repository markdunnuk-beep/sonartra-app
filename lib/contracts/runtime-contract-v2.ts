import type {
  SonartraAssessmentPackageV2Metadata,
  SonartraAssessmentPackageV2Normalization,
  SonartraAssessmentPackageV2Output,
  SonartraAssessmentPackageV2Scoring,
} from '@/lib/contracts/package-contract-v2'

export interface SonartraRuntimeContractV2CompiledOption {
  id: string
  questionId: string
  text: string
  order: number
}

export interface SonartraRuntimeContractV2CompiledQuestion {
  id: string
  questionSetId: string
  text: string
  order: number
  options: SonartraRuntimeContractV2CompiledOption[]
}

export interface SonartraRuntimeContractV2CompiledSignalMapping {
  optionId: string
  signalKey: string
  weight: number
  domain?: string
}

export interface SonartraRuntimeContractV2SignalRegistryEntry {
  signalKey: string
  domains: string[]
}

export interface SonartraRuntimeContractV2SignalRegistry {
  signalKeys: string[]
  domains: string[]
  entries: SonartraRuntimeContractV2SignalRegistryEntry[]
}

export interface SonartraRuntimeContractV2NormalizationPrep {
  expectedSignalKeys: string[]
  expectedDomains: string[]
  method: SonartraAssessmentPackageV2Normalization['method']
}

export interface SonartraRuntimeContractV2 {
  metadata: SonartraAssessmentPackageV2Metadata
  compiledQuestions: SonartraRuntimeContractV2CompiledQuestion[]
  compiledOptions: SonartraRuntimeContractV2CompiledOption[]
  compiledSignalMappings: Record<string, SonartraRuntimeContractV2CompiledSignalMapping[]>
  signalRegistry: SonartraRuntimeContractV2SignalRegistry
  scoringConfig: SonartraAssessmentPackageV2Scoring
  normalizationConfig: SonartraAssessmentPackageV2Normalization
  normalizationPrep: SonartraRuntimeContractV2NormalizationPrep
  outputConfig: SonartraAssessmentPackageV2Output
}
