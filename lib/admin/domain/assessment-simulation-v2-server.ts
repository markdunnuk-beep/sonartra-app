import 'server-only'

import { evaluateAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import { getOrCompileRuntime } from '@/lib/admin/domain/assessment-package-v2-performance-server'
import { materializeAssessmentOutputsV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import { parseStoredValidatedAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2'
import type { AdminAssessmentSimulationIssue } from '@/lib/admin/domain/assessment-simulation'
import {
  detectReadiness,
  toIssuesFromTechnicalDiagnostics,
  type AdminSimulationViewModelV2,
  type AdminAssessmentSimulationRequestV2,
  type ExecuteAdminAssessmentSimulationV2Result,
} from '@/lib/admin/domain/assessment-simulation-v2'

function toIssue(path: string, message: string): AdminAssessmentSimulationIssue {
  return { path, message }
}

export function executeAdminAssessmentSimulationV2(
  storedPackage: unknown,
  request: AdminAssessmentSimulationRequestV2,
): ExecuteAdminAssessmentSimulationV2Result {
  const pkg = parseStoredValidatedAssessmentPackageV2(storedPackage)
  const pkgErrors: AdminAssessmentSimulationIssue[] = []
  const compileErrors: AdminAssessmentSimulationIssue[] = []

  if (!pkg) {
    pkgErrors.push(toIssue('package', 'Package Contract v2 simulation is unavailable because the stored package is missing or invalid.'))
  }

  const compileResult = pkg ? getOrCompileRuntime(pkg, {
    onDiagnostic: (diagnostic) => console.info('[admin-assessment-simulation-v2]', diagnostic),
  }) : null
  if (compileResult && !compileResult.ok) {
    for (const diagnostic of compileResult.diagnostics.filter((entry) => entry.severity === 'error')) {
      compileErrors.push(toIssue(diagnostic.path, diagnostic.message))
    }
  }

  const readiness = detectReadiness(pkg, compileResult?.executablePackage ?? null, compileErrors)
  const notReady = !readiness.simulatable
  if (!pkg || !compileResult?.executablePackage || notReady) {
    return {
      ok: false,
      result: {
        contractVersion: 'package_contract_v2',
        readiness,
        readinessStatus: 'not_ready',
        compileStatus: 'failed',
        evaluationStatus: 'not_run',
        errors: [...pkgErrors, ...compileErrors],
        warnings: [],
        summaryMetrics: {
          answeredCount: Object.keys(request.responses).length,
          totalQuestions: pkg?.questions.length ?? 0,
          scoredDimensions: 0,
          insufficientDimensions: 0,
          triggeredOutputCount: 0,
          triggeredIntegrityCount: 0,
        },
        materializedOutputs: null,
        viewModel: null,
        debug: {
          compiledPackageKey: null,
          evaluationId: null,
          responsePayload: { ...request.responses },
        },
      },
    }
  }

  const evaluation = evaluateAssessmentPackageV2(compileResult.executablePackage, request.responses, {
    includeTrace: true,
    evaluationId: 'admin-simulation-v2',
  })

  const materializedOutputs = materializeAssessmentOutputsV2(compileResult.executablePackage, evaluation)
  const warnings = toIssuesFromTechnicalDiagnostics(materializedOutputs.technicalDiagnostics.filter((entry) => entry.severity === 'warning'))
  const errors = toIssuesFromTechnicalDiagnostics(materializedOutputs.technicalDiagnostics.filter((entry) => entry.severity === 'error'))

  const answeredQuestionIds = Object.keys(request.responses).filter((questionId) => request.responses[questionId] !== undefined)
  const missingQuestionIds = compileResult.executablePackage.executionPlan.questionIds.filter((questionId) => !answeredQuestionIds.includes(questionId))

  const viewModel: AdminSimulationViewModelV2 = {
    packageSummary: {
      assessmentKey: compileResult.executablePackage.metadata.assessmentKey,
      assessmentName: compileResult.executablePackage.metadata.assessmentName,
      packageSemver: compileResult.executablePackage.metadata.compatibility.packageSemver,
      questionCount: compileResult.executablePackage.executionPlan.questionIds.length,
    },
    responseSummary: {
      answeredCount: answeredQuestionIds.length,
      totalQuestions: compileResult.executablePackage.executionPlan.questionIds.length,
      answeredQuestionIds,
      missingQuestionIds,
    },
    rawDimensions: Object.values(evaluation.rawDimensions).map((result) => ({
      id: result.dimensionId,
      label: result.label,
      status: result.status,
      rawScore: result.rawScore,
      answeredCount: result.answeredCount,
      expectedCount: result.expectedCount,
    })),
    derivedDimensions: Object.values(evaluation.derivedDimensions).map((result) => ({
      id: result.derivedDimensionId,
      label: result.label,
      status: result.status,
      rawScore: result.rawScore,
    })),
    normalizedValues: evaluation.normalizedResults.map((result) => ({
      targetId: result.targetId,
      targetKind: result.targetKind,
      status: result.status,
      normalizedScore: result.normalizedScore,
      band: result.band,
      label: result.label,
    })),
    integrityFindings: evaluation.integrityFindings.map((finding) => ({
      ruleId: finding.ruleId,
      status: finding.status,
      severity: finding.severity,
      message: finding.message,
    })),
    outputRules: evaluation.outputRuleFindings.map((finding) => ({
      ruleId: finding.ruleId,
      key: finding.key,
      status: finding.status,
      severity: finding.severity,
      band: finding.band,
    })),
    materializedWebSummaryOutputs: materializedOutputs.webSummaryOutputs,
    materializedReportSections: materializedOutputs.reportDocument.sections,
    technicalDiagnostics: materializedOutputs.technicalDiagnostics,
    materializationDebug: {
      triggeredOutputKeys: evaluation.outputRuleFindings.filter((finding) => finding.status === 'triggered').map((finding) => finding.key),
      nonTriggeredOutputKeys: evaluation.outputRuleFindings.filter((finding) => finding.status !== 'triggered').map((finding) => finding.key),
    },
  }

  return {
    ok: evaluation.status !== 'failed' && errors.length === 0,
    result: {
      contractVersion: 'package_contract_v2',
      readiness,
      readinessStatus: warnings.length > 0 ? 'simulatable_with_warnings' : 'simulatable',
      compileStatus: 'ready',
      evaluationStatus: evaluation.status,
      errors,
      warnings,
      summaryMetrics: {
        answeredCount: answeredQuestionIds.length,
        totalQuestions: compileResult.executablePackage.executionPlan.questionIds.length,
        scoredDimensions: Object.values(evaluation.rawDimensions).filter((entry) => entry.status === 'scored').length,
        insufficientDimensions: Object.values(evaluation.rawDimensions).filter((entry) => entry.status !== 'scored').length,
        triggeredOutputCount: evaluation.outputRuleFindings.filter((entry) => entry.status === 'triggered').length,
        triggeredIntegrityCount: evaluation.integrityFindings.filter((entry) => entry.status === 'triggered').length,
      },
      materializedOutputs,
      viewModel,
      debug: {
        compiledPackageKey: compileResult.executablePackage.metadata.assessmentKey,
        evaluationId: evaluation.executionMetadata.evaluationId,
        responsePayload: { ...request.responses },
      },
    },
  }
}
