import type { PoolClient } from 'pg'

import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '@/lib/admin/domain/assessment-package-v2'
import { compilePackageToRuntimeContract } from '@/lib/server/package-compiler-v2'
import { validatePackageV2 } from '@/lib/server/package-validator-v2'
import { withTransaction } from '@/lib/db'

type RuntimeMaterializeClient = Pick<PoolClient, 'query'>

export interface RuntimeV2MaterializationFingerprint {
  questionSetCount: number
  questionCount: number
  optionCount: number
  mappingCount: number
  signalCount: number
  domainCount: number
}

export interface RuntimeV2MaterializationResult {
  success: boolean
  runtimeVersionId?: string
  fingerprint?: RuntimeV2MaterializationFingerprint
  errors?: string[]
}

function isStructurallyComplete(input: {
  questionSetCount: number
  questionCount: number
  optionCount: number
  mappingCount: number
}): boolean {
  return input.questionSetCount > 0
    && input.questionCount > 0
    && input.optionCount > 0
    && input.mappingCount > 0
}

function buildFingerprint(compiled: ReturnType<typeof compilePackageToRuntimeContract>): RuntimeV2MaterializationFingerprint {
  const mappingCount = Object.values(compiled.compiledSignalMappings).reduce((sum, entries) => sum + entries.length, 0)
  return {
    questionSetCount: new Set(compiled.compiledQuestions.map((entry) => entry.questionSetId)).size,
    questionCount: compiled.compiledQuestions.length,
    optionCount: compiled.compiledOptions.length,
    mappingCount,
    signalCount: compiled.signalRegistry.signalKeys.length,
    domainCount: compiled.signalRegistry.domains.length,
  }
}

async function persistMaterialization(input: {
  client: RuntimeMaterializeClient
  assessmentVersionId: string
  assessmentDefinitionId: string
  compiled: ReturnType<typeof compilePackageToRuntimeContract>
  fingerprint: RuntimeV2MaterializationFingerprint
}): Promise<string> {
  const { client, assessmentVersionId, assessmentDefinitionId, compiled } = input

  await client.query(
    `DELETE FROM assessment_runtime_versions_v2
     WHERE assessment_version_id = $1`,
    [assessmentVersionId],
  )

  const runtimeVersion = await client.query<{ id: string }>(
    `INSERT INTO assessment_runtime_versions_v2 (
       assessment_version_id,
       assessment_definition_id,
       version_label,
       version_key,
       runtime_contract_version,
       source_package_schema_version,
       publish_status,
       materialization_status,
       compiled_metadata_json,
       compiled_scoring_config_json,
       compiled_normalization_config_json,
       compiled_output_config_json,
       signal_registry_json
     )
     VALUES ($1, $2, $3, $4, 'v2', $5, 'materialized', 'complete', $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb)
     RETURNING id`,
    [
      assessmentVersionId,
      assessmentDefinitionId,
      compiled.metadata.version,
      compiled.metadata.version,
      SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
      JSON.stringify(compiled.metadata),
      JSON.stringify(compiled.scoringConfig),
      JSON.stringify(compiled.normalizationConfig),
      JSON.stringify(compiled.outputConfig),
      JSON.stringify(compiled.signalRegistry),
    ],
  )

  const runtimeVersionId = runtimeVersion.rows[0]?.id
  if (!runtimeVersionId) {
    throw new Error('Runtime v2 version row could not be created.')
  }

  const questionSetOrder = new Map<string, number>()
  for (const question of compiled.compiledQuestions) {
    if (!questionSetOrder.has(question.questionSetId)) {
      questionSetOrder.set(question.questionSetId, questionSetOrder.size + 1)
    }
  }

  for (const [questionSetId, displayOrder] of questionSetOrder.entries()) {
    await client.query(
      `INSERT INTO assessment_runtime_question_sets_v2 (runtime_version_id, question_set_id, title, display_order)
       VALUES ($1, $2, $3, $4)`,
      [runtimeVersionId, questionSetId, questionSetId, displayOrder],
    )
  }

  for (const question of compiled.compiledQuestions) {
    await client.query(
      `INSERT INTO assessment_runtime_questions_v2 (runtime_version_id, question_id, question_set_id, text, display_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [runtimeVersionId, question.id, question.questionSetId, question.text, question.order],
    )
  }

  for (const option of compiled.compiledOptions) {
    await client.query(
      `INSERT INTO assessment_runtime_options_v2 (runtime_version_id, option_id, question_id, text, display_order)
       VALUES ($1, $2, $3, $4, $5)`,
      [runtimeVersionId, option.id, option.questionId, option.text, option.order],
    )
  }

  for (const question of compiled.compiledQuestions) {
    const mappings = compiled.compiledSignalMappings[question.id] ?? []
    for (const [mappingIndex, mapping] of mappings.entries()) {
      await client.query(
        `INSERT INTO assessment_runtime_option_signal_mappings_v2 (
           runtime_version_id,
           option_id,
           question_id,
           signal_key,
           domain,
           weight,
           mapping_order
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [runtimeVersionId, mapping.optionId, question.id, mapping.signalKey, mapping.domain ?? null, mapping.weight, mappingIndex + 1],
      )
    }
  }

  return runtimeVersionId
}

export async function materializeRuntimeContractV2ForAssessmentVersion(args: {
  assessmentVersionId: string
  assessmentDefinitionId: string
  packagePayload: unknown
}, deps: {
  validateFn?: typeof validatePackageV2
  compileFn?: typeof compilePackageToRuntimeContract
  withTransactionFn?: typeof withTransaction
} = {}): Promise<RuntimeV2MaterializationResult> {
  const validateFn = deps.validateFn ?? validatePackageV2
  const compileFn = deps.compileFn ?? compilePackageToRuntimeContract
  const withTransactionFn = deps.withTransactionFn ?? withTransaction

  const validated = validateFn(args.packagePayload)
  if (!validated.valid || !validated.normalized) {
    return { success: false, errors: validated.errors }
  }

  let compiled: ReturnType<typeof compilePackageToRuntimeContract>
  try {
    compiled = compileFn(validated.normalized)
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Runtime contract compilation failed.'],
    }
  }

  const fingerprint = buildFingerprint(compiled)
  if (!isStructurallyComplete(fingerprint)) {
    return {
      success: false,
      errors: ['Compiled Runtime Contract v2 artifact is incomplete and cannot be materialized.'],
      fingerprint,
    }
  }

  try {
    const runtimeVersionId = await withTransactionFn((client) => persistMaterialization({
      client,
      assessmentVersionId: args.assessmentVersionId,
      assessmentDefinitionId: args.assessmentDefinitionId,
      compiled,
      fingerprint,
    }))

    console.info('[runtime-v2-materializer] materialization completed', {
      assessmentVersionId: args.assessmentVersionId,
      assessmentDefinitionId: args.assessmentDefinitionId,
      runtimeVersionId,
      fingerprint,
    })

    return {
      success: true,
      runtimeVersionId,
      fingerprint,
    }
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Runtime v2 materialization failed unexpectedly.'],
      fingerprint,
    }
  }
}
