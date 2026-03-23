import { compileAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import type {
  SonartraAssessmentPackageV2Option,
  SonartraAssessmentPackageV2ResponseModel,
  SonartraAssessmentPackageV2ValidatedImport,
} from '@/lib/admin/domain/assessment-package-v2'

export type PackageV2LiveRuntimeCapability = 'question_delivery' | 'response_save' | 'completion' | 'result_read'

export type PackageV2LiveRuntimeIssueCode =
  | 'package_invalid'
  | 'package_not_compilable'
  | 'invalid_response'
  | 'question_missing_response_model'
  | 'response_model_without_options'
  | 'unsupported_response_model'

export interface PackageV2LiveRuntimeIssue {
  capability: PackageV2LiveRuntimeCapability
  code: PackageV2LiveRuntimeIssueCode
  message: string
  details?: Record<string, unknown>
}

export interface PackageV2LiveRuntimeSupportResult {
  supported: boolean
  issues: PackageV2LiveRuntimeIssue[]
}

export interface CanonicalV2ResponseEnvelope {
  responses: Record<string, unknown>
  updatedAtByQuestionId: Record<string, string>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getResponseModelOptions(
  pkg: SonartraAssessmentPackageV2ValidatedImport,
  responseModel: SonartraAssessmentPackageV2ResponseModel,
): SonartraAssessmentPackageV2Option[] {
  return [
    ...(responseModel.optionSetId ? (pkg.responseModels.optionSets ?? []).find((entry) => entry.id === responseModel.optionSetId)?.options ?? [] : []),
    ...(responseModel.options ?? []),
  ]
}

function sortOptionIdsByResponseModelOrder(optionIds: string[], options: SonartraAssessmentPackageV2Option[]) {
  const optionOrder = new Map(options.map((option, index) => [option.id, index]))
  return [...optionIds].sort((left, right) => (optionOrder.get(left) ?? Number.MAX_SAFE_INTEGER) - (optionOrder.get(right) ?? Number.MAX_SAFE_INTEGER))
}

export function normalizeV2LiveResponseValue(input: {
  pkg: SonartraAssessmentPackageV2ValidatedImport
  questionId: string
  response: unknown
}): { ok: true; value: unknown } | { ok: false; issue: PackageV2LiveRuntimeIssue } {
  const question = input.pkg.questions.find((entry) => entry.id === input.questionId)
  if (!question) {
    return {
      ok: false,
      issue: {
        capability: 'response_save',
        code: 'question_missing_response_model',
        message: 'Question id is not part of this assessment session.',
        details: { questionId: input.questionId },
      },
    }
  }

  const responseModel = input.pkg.responseModels.models.find((entry) => entry.id === question.responseModelId)
  if (!responseModel) {
    return {
      ok: false,
      issue: {
        capability: 'response_save',
        code: 'question_missing_response_model',
        message: `Question "${input.questionId}" is missing a valid response model.`,
        details: { questionId: input.questionId, responseModelId: question.responseModelId },
      },
    }
  }

  const options = getResponseModelOptions(input.pkg, responseModel)
  const optionIds = new Set(options.map((option) => option.id))

  switch (responseModel.type) {
    case 'numeric':
      if (typeof input.response !== 'number' || !Number.isFinite(input.response)) {
        return {
          ok: false,
          issue: {
            capability: 'response_save',
            code: 'invalid_response',
            message: `Question "${input.questionId}" expects a numeric response.`,
          },
        }
      }

      if (
        responseModel.numericRange
        && (input.response < responseModel.numericRange.min || input.response > responseModel.numericRange.max)
      ) {
        return {
          ok: false,
          issue: {
            capability: 'response_save',
            code: 'invalid_response',
            message: `Question "${input.questionId}" expects a value between ${responseModel.numericRange.min} and ${responseModel.numericRange.max}.`,
          },
        }
      }

      return { ok: true, value: input.response }
    case 'boolean':
      return typeof input.response === 'boolean'
        ? { ok: true, value: input.response }
        : {
            ok: false,
            issue: {
              capability: 'response_save',
              code: 'invalid_response',
              message: `Question "${input.questionId}" expects a boolean response.`,
            },
          }
    case 'multi_select': {
      if (!Array.isArray(input.response)) {
        return {
          ok: false,
          issue: {
            capability: 'response_save',
            code: 'invalid_response',
            message: `Question "${input.questionId}" expects an array of option ids.`,
          },
        }
      }

      const selected = input.response.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      const unique = new Set(selected)
      if (selected.length !== input.response.length || unique.size !== selected.length || selected.some((optionId) => !optionIds.has(optionId))) {
        return {
          ok: false,
          issue: {
            capability: 'response_save',
            code: 'invalid_response',
            message: `Question "${input.questionId}" includes one or more unknown option ids.`,
          },
        }
      }

      if (typeof responseModel.multiSelect?.minSelections === 'number' && selected.length < responseModel.multiSelect.minSelections) {
        return {
          ok: false,
          issue: {
            capability: 'response_save',
            code: 'invalid_response',
            message: `Question "${input.questionId}" requires at least ${responseModel.multiSelect.minSelections} selections.`,
          },
        }
      }

      if (typeof responseModel.multiSelect?.maxSelections === 'number' && selected.length > responseModel.multiSelect.maxSelections) {
        return {
          ok: false,
          issue: {
            capability: 'response_save',
            code: 'invalid_response',
            message: `Question "${input.questionId}" allows at most ${responseModel.multiSelect.maxSelections} selections.`,
          },
        }
      }

      return { ok: true, value: sortOptionIdsByResponseModelOrder(selected, options) }
    }
    case 'likert':
    case 'single_select':
    case 'forced_choice':
      return typeof input.response === 'string' && optionIds.has(input.response)
        ? { ok: true, value: input.response }
        : {
            ok: false,
            issue: {
              capability: 'response_save',
              code: 'invalid_response',
              message: `Question "${input.questionId}" expects a valid option id.`,
            },
          }
    default:
      return {
        ok: false,
        issue: {
          capability: 'response_save',
          code: 'unsupported_response_model',
          message: `Question "${input.questionId}" uses unsupported live response model "${responseModel.type}".`,
          details: { questionId: input.questionId, responseModelId: responseModel.id, responseModelType: responseModel.type },
        },
      }
  }
}

export function canonicalizeV2ResponseEnvelope(
  pkg: SonartraAssessmentPackageV2ValidatedImport,
  metadataJson: Record<string, unknown> | null | undefined,
): CanonicalV2ResponseEnvelope {
  const runtime = metadataJson && isRecord(metadataJson.liveRuntimeV2) ? metadataJson.liveRuntimeV2 : null
  const rawResponses = runtime && isRecord(runtime.responses) ? runtime.responses : {}
  const rawUpdatedAt = runtime && isRecord(runtime.updatedAtByQuestionId) ? runtime.updatedAtByQuestionId : {}

  const responses: Record<string, unknown> = {}
  const updatedAtByQuestionId: Record<string, string> = {}

  for (const question of pkg.questions) {
    if (!(question.id in rawResponses)) {
      continue
    }

    const normalized = normalizeV2LiveResponseValue({
      pkg,
      questionId: question.id,
      response: rawResponses[question.id],
    })

    if (!normalized.ok) {
      continue
    }

    responses[question.id] = normalized.value

    const updatedAt = rawUpdatedAt[question.id]
    if (typeof updatedAt === 'string' && updatedAt.trim()) {
      updatedAtByQuestionId[question.id] = updatedAt
    }
  }

  return { responses, updatedAtByQuestionId }
}

export function evaluatePackageV2LiveRuntimeSupport(
  pkg: SonartraAssessmentPackageV2ValidatedImport | null,
  deps: {
    compile?: typeof compileAssessmentPackageV2
  } = {},
): PackageV2LiveRuntimeSupportResult {
  if (!pkg) {
    return {
      supported: false,
      issues: [{
        capability: 'question_delivery',
        code: 'package_invalid',
        message: 'Package Contract v2 runtime is unavailable because the stored package is missing or invalid.',
      }],
    }
  }

  const compile = deps.compile ?? compileAssessmentPackageV2
  const compiled = compile(pkg)
  const issues: PackageV2LiveRuntimeIssue[] = []

  if (!compiled.ok || !compiled.executablePackage) {
    const blockingDiagnostic = compiled.diagnostics.find((entry) => entry.severity === 'error')
    issues.push({
      capability: 'completion',
      code: 'package_not_compilable',
      message: blockingDiagnostic?.message ?? 'Package Contract v2 could not be compiled for live runtime execution.',
      details: blockingDiagnostic ? { path: blockingDiagnostic.path, diagnosticCode: blockingDiagnostic.code } : undefined,
    })
  }

  for (const question of pkg.questions) {
    const responseModel = pkg.responseModels.models.find((entry) => entry.id === question.responseModelId)
    if (!responseModel) {
      issues.push({
        capability: 'question_delivery',
        code: 'question_missing_response_model',
        message: `Question "${question.id}" is missing response model "${question.responseModelId}".`,
        details: { questionId: question.id, responseModelId: question.responseModelId },
      })
      continue
    }

    if (responseModel.type !== 'numeric' && responseModel.type !== 'boolean') {
      const options = getResponseModelOptions(pkg, responseModel)
      if (options.length === 0) {
        issues.push({
          capability: 'question_delivery',
          code: 'response_model_without_options',
          message: `Question "${question.id}" cannot be delivered live because response model "${responseModel.id}" has no options.`,
          details: { questionId: question.id, responseModelId: responseModel.id },
        })
      }
    }

    if (!['numeric', 'boolean', 'multi_select', 'single_select', 'likert', 'forced_choice'].includes(responseModel.type)) {
      issues.push({
        capability: 'response_save',
        code: 'unsupported_response_model',
        message: `Question "${question.id}" uses unsupported live response model "${responseModel.type}".`,
        details: { questionId: question.id, responseModelId: responseModel.id, responseModelType: responseModel.type },
      })
    }
  }

  return {
    supported: issues.length === 0,
    issues,
  }
}
