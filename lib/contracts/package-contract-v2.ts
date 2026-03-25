export interface SonartraAssessmentPackageV2Metadata {
  definitionId: string
  version: string
  title: string
  description?: string
}

export interface SonartraAssessmentPackageV2QuestionSet {
  id: string
  title: string
  order: number
}

export interface SonartraAssessmentPackageV2Question {
  id: string
  questionSetId: string
  text: string
  order: number
}

export interface SonartraAssessmentPackageV2Option {
  id: string
  questionId: string
  text: string
  order: number
}

export interface SonartraAssessmentPackageV2SignalMapping {
  optionId: string
  signalKey: string
  weight: number
  domain?: string
}

export interface SonartraAssessmentPackageV2Scoring {
  method: 'weighted_sum'
}

export interface SonartraAssessmentPackageV2Normalization {
  method: 'percentage_distribution'
  enforceTotal: 100
}

export interface SonartraAssessmentPackageV2Output {
  generateRankings: boolean
  generateDomainSummaries: boolean
  generateOverview: boolean
}

export interface SonartraAssessmentPackageV2 {
  metadata: SonartraAssessmentPackageV2Metadata
  questionSets: SonartraAssessmentPackageV2QuestionSet[]
  questions: SonartraAssessmentPackageV2Question[]
  options: SonartraAssessmentPackageV2Option[]
  signalMappings: SonartraAssessmentPackageV2SignalMapping[]
  scoring: SonartraAssessmentPackageV2Scoring
  normalization: SonartraAssessmentPackageV2Normalization
  output: SonartraAssessmentPackageV2Output
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isSonartraAssessmentPackageV2(input: unknown): input is SonartraAssessmentPackageV2 {
  if (!isRecord(input)) {
    return false
  }

  const metadata = input.metadata
  const questionSets = input.questionSets
  const questions = input.questions
  const options = input.options
  const signalMappings = input.signalMappings
  const scoring = input.scoring
  const normalization = input.normalization
  const output = input.output

  if (!isRecord(metadata) || !isNonEmptyString(metadata.definitionId) || !isNonEmptyString(metadata.version) || !isNonEmptyString(metadata.title)) {
    return false
  }

  if (!Array.isArray(questionSets) || !questionSets.every((entry) => isRecord(entry) && isNonEmptyString(entry.id) && isNonEmptyString(entry.title) && isFiniteNumber(entry.order))) {
    return false
  }

  if (!Array.isArray(questions) || !questions.every((entry) => isRecord(entry) && isNonEmptyString(entry.id) && isNonEmptyString(entry.questionSetId) && isNonEmptyString(entry.text) && isFiniteNumber(entry.order))) {
    return false
  }

  if (!Array.isArray(options) || !options.every((entry) => isRecord(entry) && isNonEmptyString(entry.id) && isNonEmptyString(entry.questionId) && isNonEmptyString(entry.text) && isFiniteNumber(entry.order))) {
    return false
  }

  if (!Array.isArray(signalMappings) || !signalMappings.every((entry) => {
    if (!isRecord(entry)) {
      return false
    }

    const hasDomain = entry.domain === undefined || isNonEmptyString(entry.domain)
    return isNonEmptyString(entry.optionId) && isNonEmptyString(entry.signalKey) && isFiniteNumber(entry.weight) && hasDomain
  })) {
    return false
  }

  if (!isRecord(scoring) || scoring.method !== 'weighted_sum') {
    return false
  }

  if (!isRecord(normalization) || normalization.method !== 'percentage_distribution' || normalization.enforceTotal !== 100) {
    return false
  }

  return isRecord(output)
    && typeof output.generateRankings === 'boolean'
    && typeof output.generateDomainSummaries === 'boolean'
    && typeof output.generateOverview === 'boolean'
}

export function assertSonartraAssessmentPackageV2(input: unknown): SonartraAssessmentPackageV2 {
  if (!isSonartraAssessmentPackageV2(input)) {
    throw new Error('Invalid SonartraAssessmentPackageV2 payload.')
  }

  return input
}
