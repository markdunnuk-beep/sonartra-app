import assert from 'node:assert/strict'
import test from 'node:test'

import { compilePackageToRuntimeContract } from '../lib/server/package-compiler-v2'
import { normalizeRuntimeV2Scores } from '../lib/server/runtime-v2-normalizer'
import { buildRuntimeV2ResultPayload } from '../lib/server/runtime-v2-result-builder'
import { parseRuntimeV2ReadyPayload } from '../lib/server/runtime-v2-readiness'
import { scoreRuntimeV2Assessment } from '../lib/server/runtime-v2-scorer'
import { buildLiveAssessmentUserResultContract } from '../lib/server/live-assessment-user-result'
import type { AssessmentResultRow, AssessmentRow } from '../lib/assessment-types'
import type { RuntimeV2ExecutionModel } from '../lib/server/runtime-v2-repository'
import type { SonartraAssessmentPackageV2 } from '../lib/contracts/package-contract-v2'

function runtimeFromCompiled(compiled: ReturnType<typeof compilePackageToRuntimeContract>): RuntimeV2ExecutionModel {
  const optionsByQuestionId: RuntimeV2ExecutionModel['optionsByQuestionId'] = {}
  for (const option of compiled.compiledOptions) {
    const bucket = optionsByQuestionId[option.questionId] ?? []
    bucket.push({ id: `ro-${option.id}`, runtime_version_id: 'runtime-e2e', option_id: option.id, question_id: option.questionId, text: option.text, display_order: option.order })
    optionsByQuestionId[option.questionId] = bucket
  }

  const mappingsByQuestionId: RuntimeV2ExecutionModel['mappingsByQuestionId'] = {}
  for (const [questionId, mappings] of Object.entries(compiled.compiledSignalMappings)) {
    mappingsByQuestionId[questionId] = mappings.map((mapping, index) => ({
      id: `map-${questionId}-${index + 1}`,
      runtime_version_id: 'runtime-e2e',
      question_id: questionId,
      option_id: mapping.optionId,
      signal_key: mapping.signalKey,
      domain: mapping.domain ?? null,
      weight: String(mapping.weight),
      mapping_order: index + 1,
    }))
  }

  return {
    runtimeVersionId: 'runtime-e2e',
    metadata: { definitionId: compiled.metadata.definitionId },
    questionSets: [],
    questions: compiled.compiledQuestions.map((question) => ({ id: `rq-${question.id}`, runtime_version_id: 'runtime-e2e', question_id: question.id, question_set_id: question.questionSetId, text: question.text, display_order: question.order })),
    optionsByQuestionId,
    mappingsByQuestionId,
    signalRegistry: compiled.signalRegistry as unknown as Record<string, unknown>,
    scoringConfig: compiled.scoringConfig as unknown as Record<string, unknown>,
    normalizationConfig: compiled.normalizationConfig as unknown as Record<string, unknown>,
    outputConfig: compiled.outputConfig as unknown as Record<string, unknown>,
  }
}

test('wplp80 runtime v2 e2e: publish -> start -> question/response -> complete -> ready -> retrieval', async () => {
  const fixture: SonartraAssessmentPackageV2 = {
    metadata: { definitionId: 'wplp80', version: '2.0.0', title: 'WPLP-80 Lite' },
    questionSets: [{ id: 'set-1', title: 'Main', order: 1 }],
    questions: [
      { id: 'q1', questionSetId: 'set-1', text: 'Q1', order: 1 },
      { id: 'q2', questionSetId: 'set-1', text: 'Q2', order: 2 },
    ],
    options: [
      { id: 'q1-a', questionId: 'q1', text: 'A', order: 1 },
      { id: 'q1-b', questionId: 'q1', text: 'B', order: 2 },
      { id: 'q2-a', questionId: 'q2', text: 'A', order: 1 },
      { id: 'q2-b', questionId: 'q2', text: 'B', order: 2 },
    ],
    signalMappings: [
      { optionId: 'q1-a', signalKey: 'S1', weight: 2, domain: 'D1' },
      { optionId: 'q1-b', signalKey: 'S2', weight: 1, domain: 'D2' },
      { optionId: 'q2-a', signalKey: 'S1', weight: 1, domain: 'D1' },
      { optionId: 'q2-b', signalKey: 'S2', weight: 2, domain: 'D2' },
    ],
    scoring: { method: 'weighted_sum' },
    normalization: { method: 'percentage_distribution', enforceTotal: 100 },
    output: { generateRankings: true, generateDomainSummaries: true, generateOverview: true },
  }

  const compiled = compilePackageToRuntimeContract(fixture)
  const executionModel = runtimeFromCompiled(compiled)

  const responses = executionModel.questions.map((question) => ({
    questionId: question.question_id,
    optionId: executionModel.optionsByQuestionId[question.question_id]![0]!.option_id,
  }))

  const scoring = scoreRuntimeV2Assessment({ runtimeVersionId: executionModel.runtimeVersionId, executionModel, responses })
  const normalization = normalizeRuntimeV2Scores({ rawSignalScores: scoring.rawSignalScores, executionModel })
  const payload = buildRuntimeV2ResultPayload({
    executionModel,
    assessmentVersionId: 'version-wplp80-lite',
    scoring,
    normalization,
    materializationFingerprint: { questionCount: 2, optionCount: 4, mappingCount: 4 },
  })

  const readiness = parseRuntimeV2ReadyPayload(payload)
  assert.equal(readiness.state, 'ready')

  const now = new Date().toISOString()
  const resultRow: AssessmentResultRow = {
    id: 'result-runtime-v2',
    assessment_id: 'assessment-runtime-v2',
    assessment_version_id: 'version-wplp80-lite',
    version_key: 'wplp80-lite-v2',
    scoring_model_key: 'runtime-contract-v2',
    snapshot_version: 1,
    status: 'complete',
    result_payload: payload as unknown as Record<string, unknown>,
    response_quality_payload: null,
    report_artifact_json: null,
    completed_at: now,
    scored_at: now,
    created_at: now,
    updated_at: now,
  }
  const assessment: AssessmentRow = {
    id: 'assessment-runtime-v2',
    user_id: 'user-1',
    organisation_id: null,
    assessment_version_id: 'version-wplp80-lite',
    status: 'completed',
    started_at: now,
    completed_at: now,
    last_activity_at: now,
    progress_count: executionModel.questions.length,
    progress_percent: '100',
    current_question_index: executionModel.questions.length,
    scoring_status: 'scored',
    source: 'web',
    metadata_json: null,
    created_at: now,
    updated_at: now,
  }

  const contract = buildLiveAssessmentUserResultContract({ assessment, result: resultRow })
  assert.equal(contract.status, 'completed')
  assert.equal(contract.resultsAvailable, true)
  assert.equal(contract.summaryCards.length > 0, true)
  assert.equal(payload.rankedSignals.length > 0, true)
  assert.equal(Object.keys(payload.normalizedScores).length > 0, true)
  assert.equal(Array.isArray(payload.domainSummaries), true)
})
