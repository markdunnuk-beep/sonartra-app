import {
  HYBRID_MVP_CONTRACT_VERSION,
  type HybridMvpAssessmentDefinition,
  type HybridMvpResponseModel,
} from '@/lib/assessment/hybrid-mvp-scoring'
import type {
  AssessmentPackageStatus,
  SonartraAssessmentPackageSummary,
  SonartraAssessmentPackageValidationIssue,
} from '@/lib/admin/domain/assessment-package'

const FORBIDDEN_TOP_LEVEL_KEYS = [
  'meta',
  'metadata',
  'identity',
  'sections',
  'dimensions',
  'scoring',
  'normalization',
  'outputs',
  'language',
  'rules',
  'scripts',
  'predicates',
  'transforms',
  'runtimePlan',
  'runtimeArtifact',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function pushIssue(collection: SonartraAssessmentPackageValidationIssue[], path: string, message: string) {
  collection.push({ path, message })
}

function hasOnlyKnownResponseModel(value: unknown): value is HybridMvpResponseModel {
  return value === 'single_select' || value === 'multi_select'
}

export interface HybridMvpDefinitionValidationResult {
  ok: boolean
  status: Exclude<AssessmentPackageStatus, 'missing'>
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
  summary: SonartraAssessmentPackageSummary
  normalizedDefinition: HybridMvpAssessmentDefinition | null
}

export function validateHybridMvpDefinitionPayload(input: unknown): HybridMvpDefinitionValidationResult {
  const errors: SonartraAssessmentPackageValidationIssue[] = []
  const warnings: SonartraAssessmentPackageValidationIssue[] = []

  if (!isRecord(input)) {
    pushIssue(errors, '$', 'Hybrid payload must be a JSON object.')
    return {
      ok: false,
      status: 'invalid',
      errors,
      warnings,
      summary: {
        dimensionsCount: 0,
        questionsCount: 0,
        optionsCount: 0,
        scoringRuleCount: 0,
        normalizationRuleCount: 0,
        outputRuleCount: 0,
        localeCount: 0,
      },
      normalizedDefinition: null,
    }
  }

  if (input.contractVersion !== HYBRID_MVP_CONTRACT_VERSION) {
    pushIssue(errors, 'contractVersion', `Expected contractVersion "${HYBRID_MVP_CONTRACT_VERSION}".`)
  }

  for (const forbidden of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (forbidden in input) {
      pushIssue(errors, forbidden, `Field "${forbidden}" is not supported in hybrid_mvp_v1 authoring/import.`)
    }
  }

  const assessmentId = asNonEmptyString(input.assessmentId)
  const assessmentKey = asNonEmptyString(input.assessmentKey)
  if (!assessmentId) {
    pushIssue(errors, 'assessmentId', 'assessmentId is required.')
  }
  if (!assessmentKey) {
    pushIssue(errors, 'assessmentKey', 'assessmentKey is required.')
  }

  const signals = Array.isArray(input.signals) ? input.signals : null
  const domains = Array.isArray(input.domains) ? input.domains : null
  const questions = Array.isArray(input.questions) ? input.questions : null

  if (!signals || signals.length === 0) {
    pushIssue(errors, 'signals', 'At least one signal is required.')
  }

  if (!domains || domains.length === 0) {
    pushIssue(errors, 'domains', 'At least one domain is required.')
  }

  if (!questions || questions.length === 0) {
    pushIssue(errors, 'questions', 'At least one question is required.')
  }

  const signalIds = new Set<string>()
  const domainIds = new Set<string>()
  let optionCount = 0

  if (domains) {
    for (let index = 0; index < domains.length; index += 1) {
      const path = `domains[${index}]`
      const domain = domains[index]
      if (!isRecord(domain)) {
        pushIssue(errors, path, 'Each domain must be an object.')
        continue
      }

      const id = asNonEmptyString(domain.id)
      const key = asNonEmptyString(domain.key)
      const label = asNonEmptyString(domain.label)
      if (!id) pushIssue(errors, `${path}.id`, 'Domain id is required.')
      if (!key) pushIssue(errors, `${path}.key`, 'Domain key is required.')
      if (!label) pushIssue(errors, `${path}.label`, 'Domain label is required.')
      if (id) {
        if (domainIds.has(id)) {
          pushIssue(errors, `${path}.id`, `Duplicate domain id "${id}".`)
        }
        domainIds.add(id)
      }
    }
  }

  if (signals) {
    for (let index = 0; index < signals.length; index += 1) {
      const path = `signals[${index}]`
      const signal = signals[index]
      if (!isRecord(signal)) {
        pushIssue(errors, path, 'Each signal must be an object.')
        continue
      }

      const id = asNonEmptyString(signal.id)
      const key = asNonEmptyString(signal.key)
      const label = asNonEmptyString(signal.label)
      const domainId = signal.domainId === null || signal.domainId === undefined ? null : asNonEmptyString(signal.domainId)
      if (!id) pushIssue(errors, `${path}.id`, 'Signal id is required.')
      if (!key) pushIssue(errors, `${path}.key`, 'Signal key is required.')
      if (!label) pushIssue(errors, `${path}.label`, 'Signal label is required.')
      if (id) {
        if (signalIds.has(id)) {
          pushIssue(errors, `${path}.id`, `Duplicate signal id "${id}".`)
        }
        signalIds.add(id)
      }
      if (domainId && !domainIds.has(domainId)) {
        pushIssue(errors, `${path}.domainId`, `Signal references unknown domain "${domainId}".`)
      }
    }
  }

  const questionIds = new Set<string>()
  if (questions) {
    for (let questionIndex = 0; questionIndex < questions.length; questionIndex += 1) {
      const questionPath = `questions[${questionIndex}]`
      const question = questions[questionIndex]
      if (!isRecord(question)) {
        pushIssue(errors, questionPath, 'Each question must be an object.')
        continue
      }

      const questionId = asNonEmptyString(question.id)
      const prompt = asNonEmptyString(question.prompt)
      if (!questionId) pushIssue(errors, `${questionPath}.id`, 'Question id is required.')
      if (!prompt) pushIssue(errors, `${questionPath}.prompt`, 'Question prompt is required.')
      if (questionId) {
        if (questionIds.has(questionId)) {
          pushIssue(errors, `${questionPath}.id`, `Duplicate question id "${questionId}".`)
        }
        questionIds.add(questionId)
      }

      if (!hasOnlyKnownResponseModel(question.responseModel)) {
        pushIssue(errors, `${questionPath}.responseModel`, 'responseModel must be single_select or multi_select.')
      }

      const options = Array.isArray(question.options) ? question.options : null
      if (!options || options.length === 0) {
        pushIssue(errors, `${questionPath}.options`, 'Question must define at least one option.')
        continue
      }

      const optionIds = new Set<string>()
      for (let optionIndex = 0; optionIndex < options.length; optionIndex += 1) {
        optionCount += 1
        const optionPath = `${questionPath}.options[${optionIndex}]`
        const option = options[optionIndex]
        if (!isRecord(option)) {
          pushIssue(errors, optionPath, 'Each option must be an object.')
          continue
        }

        const optionId = asNonEmptyString(option.id)
        const optionLabel = asNonEmptyString(option.label)
        if (!optionId) pushIssue(errors, `${optionPath}.id`, 'Option id is required.')
        if (!optionLabel) pushIssue(errors, `${optionPath}.label`, 'Option label is required.')
        if (optionId) {
          if (optionIds.has(optionId)) {
            pushIssue(errors, `${optionPath}.id`, `Duplicate option id "${optionId}" in this question.`)
          }
          optionIds.add(optionId)
        }

        const signalWeights = Array.isArray(option.signalWeights) ? option.signalWeights : null
        if (!signalWeights || signalWeights.length === 0) {
          pushIssue(errors, `${optionPath}.signalWeights`, 'Option must include at least one signal weight mapping.')
          continue
        }

        for (let weightIndex = 0; weightIndex < signalWeights.length; weightIndex += 1) {
          const weightPath = `${optionPath}.signalWeights[${weightIndex}]`
          const weight = signalWeights[weightIndex]
          if (!isRecord(weight)) {
            pushIssue(errors, weightPath, 'Each signal weight must be an object.')
            continue
          }

          const signalId = asNonEmptyString(weight.signalId)
          if (!signalId) {
            pushIssue(errors, `${weightPath}.signalId`, 'signalId is required.')
          } else if (!signalIds.has(signalId)) {
            pushIssue(errors, `${weightPath}.signalId`, `signalId "${signalId}" is not defined in signals.`)
          }

          if (typeof weight.weight !== 'number' || !Number.isFinite(weight.weight)) {
            pushIssue(errors, `${weightPath}.weight`, 'weight must be a finite number.')
          }
        }
      }
    }
  }

  const outputTemplates = input.outputTemplates
  if (outputTemplates !== undefined) {
    if (!isRecord(outputTemplates)) {
      pushIssue(errors, 'outputTemplates', 'outputTemplates must be an object when provided.')
    } else {
      if (outputTemplates.overview !== undefined) {
        if (!isRecord(outputTemplates.overview)) {
          pushIssue(errors, 'outputTemplates.overview', 'overview must be an object when provided.')
        } else {
          for (const key of ['highPerformer', 'balancedProfile', 'developingProfile', 'default'] as const) {
            const value = outputTemplates.overview[key]
            if (value !== undefined && asNonEmptyString(value) === null) {
              pushIssue(errors, `outputTemplates.overview.${key}`, `${key} must be a non-empty string when provided.`)
            }
          }
        }
      }

      if (outputTemplates.signalNarratives !== undefined) {
        if (!isRecord(outputTemplates.signalNarratives)) {
          pushIssue(errors, 'outputTemplates.signalNarratives', 'signalNarratives must be an object keyed by signal id.')
        } else {
          for (const [signalId, templateSet] of Object.entries(outputTemplates.signalNarratives)) {
            if (!signalIds.has(signalId)) {
              pushIssue(errors, `outputTemplates.signalNarratives.${signalId}`, `Unknown signal id "${signalId}" in signalNarratives.`)
            }
            if (!isRecord(templateSet)) {
              pushIssue(errors, `outputTemplates.signalNarratives.${signalId}`, 'Each signal narrative entry must be an object.')
              continue
            }
            for (const key of ['high', 'balanced', 'low', 'default'] as const) {
              const value = templateSet[key]
              if (value !== undefined && asNonEmptyString(value) === null) {
                pushIssue(errors, `outputTemplates.signalNarratives.${signalId}.${key}`, `${key} must be a non-empty string when provided.`)
              }
            }
          }
        }
      }

      if (outputTemplates.domainNarratives !== undefined) {
        if (!isRecord(outputTemplates.domainNarratives)) {
          pushIssue(errors, 'outputTemplates.domainNarratives', 'domainNarratives must be an object keyed by domain id.')
        } else {
          for (const [domainId, templateSet] of Object.entries(outputTemplates.domainNarratives)) {
            if (!domainIds.has(domainId)) {
              pushIssue(errors, `outputTemplates.domainNarratives.${domainId}`, `Unknown domain id "${domainId}" in domainNarratives.`)
            }
            if (!isRecord(templateSet)) {
              pushIssue(errors, `outputTemplates.domainNarratives.${domainId}`, 'Each domain narrative entry must be an object.')
              continue
            }
            if (templateSet.summary !== undefined && asNonEmptyString(templateSet.summary) === null) {
              pushIssue(errors, `outputTemplates.domainNarratives.${domainId}.summary`, 'summary must be a non-empty string when provided.')
            }
          }
        }
      }
    }
  }

  if ((questions?.length ?? 0) > 0 && (questions ?? []).some((entry) => !isRecord(entry) || !Array.isArray(entry.options))) {
    pushIssue(warnings, 'questions', 'Some question records were not fully parseable for preview.')
  }

  const outputTemplatesRecord = isRecord(outputTemplates) ? outputTemplates : null
  const summary: SonartraAssessmentPackageSummary = {
    dimensionsCount: domainIds.size,
    questionsCount: questionIds.size,
    optionsCount: optionCount,
    scoringRuleCount: 0,
    normalizationRuleCount: 0,
    outputRuleCount:
      (outputTemplatesRecord && isRecord(outputTemplatesRecord.signalNarratives) ? Object.keys(outputTemplatesRecord.signalNarratives).length : 0)
      + (outputTemplatesRecord && isRecord(outputTemplatesRecord.domainNarratives) ? Object.keys(outputTemplatesRecord.domainNarratives).length : 0)
      + (outputTemplatesRecord && isRecord(outputTemplatesRecord.overview) ? 1 : 0),
    localeCount: 0,
    packageName: assessmentKey,
    versionLabel: HYBRID_MVP_CONTRACT_VERSION,
    assessmentKey,
  }

  const ok = errors.length === 0
  return {
    ok,
    status: ok ? (warnings.length > 0 ? 'valid_with_warnings' : 'valid') : 'invalid',
    errors,
    warnings,
    summary,
    normalizedDefinition: ok ? (input as unknown as HybridMvpAssessmentDefinition) : null,
  }
}
