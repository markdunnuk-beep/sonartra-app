import { queryDb } from '@/lib/db'

interface RuntimeVersionRow {
  id: string
  assessment_version_id: string
  assessment_definition_id: string
  runtime_contract_version: string
  source_package_schema_version: string | null
  publish_status: string
  materialization_status: string
  compiled_metadata_json: Record<string, unknown>
  compiled_scoring_config_json: Record<string, unknown>
  compiled_normalization_config_json: Record<string, unknown>
  compiled_output_config_json: Record<string, unknown>
  signal_registry_json: Record<string, unknown>
}

interface RuntimeQuestionSetRow {
  id: string
  runtime_version_id: string
  question_set_id: string
  title: string
  display_order: number
}

interface RuntimeQuestionRow {
  id: string
  runtime_version_id: string
  question_id: string
  question_set_id: string
  text: string
  display_order: number
}

interface RuntimeOptionRow {
  id: string
  runtime_version_id: string
  option_id: string
  question_id: string
  text: string
  display_order: number
}

interface RuntimeMappingRow {
  id: string
  runtime_version_id: string
  option_id: string
  question_id: string
  signal_key: string
  domain: string | null
  weight: string
  mapping_order: number
}

export interface RuntimeV2ExecutionModel {
  runtimeVersionId: string
  metadata: Record<string, unknown>
  questionSets: RuntimeQuestionSetRow[]
  questions: RuntimeQuestionRow[]
  optionsByQuestionId: Record<string, RuntimeOptionRow[]>
  mappingsByQuestionId: Record<string, RuntimeMappingRow[]>
  signalRegistry: Record<string, unknown>
  scoringConfig: Record<string, unknown>
  normalizationConfig: Record<string, unknown>
  outputConfig: Record<string, unknown>
}

export async function getMaterializedRuntimeVersionByAssessmentVersionId(assessmentVersionId: string): Promise<RuntimeVersionRow | null> {
  const result = await queryDb<RuntimeVersionRow>(
    `SELECT id,
            assessment_version_id,
            assessment_definition_id,
            runtime_contract_version,
            source_package_schema_version,
            publish_status,
            materialization_status,
            compiled_metadata_json,
            compiled_scoring_config_json,
            compiled_normalization_config_json,
            compiled_output_config_json,
            signal_registry_json
     FROM assessment_runtime_versions_v2
     WHERE assessment_version_id = $1
       AND materialization_status = 'complete'
     LIMIT 1`,
    [assessmentVersionId],
  )

  return result.rows[0] ?? null
}

export async function getMaterializedRuntimeVersionForPublishedDefinition(definitionId: string): Promise<RuntimeVersionRow | null> {
  const result = await queryDb<RuntimeVersionRow>(
    `SELECT rv.id,
            rv.assessment_version_id,
            rv.assessment_definition_id,
            rv.runtime_contract_version,
            rv.source_package_schema_version,
            rv.publish_status,
            rv.materialization_status,
            rv.compiled_metadata_json,
            rv.compiled_scoring_config_json,
            rv.compiled_normalization_config_json,
            rv.compiled_output_config_json,
            rv.signal_registry_json
     FROM assessment_runtime_versions_v2 rv
     INNER JOIN assessment_versions av ON av.id = rv.assessment_version_id
     INNER JOIN assessment_definitions ad ON ad.current_published_version_id = av.id
     WHERE rv.assessment_definition_id = $1
       AND rv.materialization_status = 'complete'
       AND av.lifecycle_status = 'published'
       AND ad.lifecycle_status = 'published'
     LIMIT 1`,
    [definitionId],
  )

  return result.rows[0] ?? null
}

export async function getRuntimeV2QuestionSets(runtimeVersionId: string): Promise<RuntimeQuestionSetRow[]> {
  const result = await queryDb<RuntimeQuestionSetRow>(
    `SELECT id, runtime_version_id, question_set_id, title, display_order
     FROM assessment_runtime_question_sets_v2
     WHERE runtime_version_id = $1
     ORDER BY display_order ASC, question_set_id ASC`,
    [runtimeVersionId],
  )
  return result.rows
}

export async function getRuntimeV2Questions(runtimeVersionId: string): Promise<RuntimeQuestionRow[]> {
  const result = await queryDb<RuntimeQuestionRow>(
    `SELECT id, runtime_version_id, question_id, question_set_id, text, display_order
     FROM assessment_runtime_questions_v2
     WHERE runtime_version_id = $1
     ORDER BY display_order ASC, question_id ASC`,
    [runtimeVersionId],
  )
  return result.rows
}

export async function getRuntimeV2OptionsForQuestions(runtimeVersionId: string): Promise<RuntimeOptionRow[]> {
  const result = await queryDb<RuntimeOptionRow>(
    `SELECT id, runtime_version_id, option_id, question_id, text, display_order
     FROM assessment_runtime_options_v2
     WHERE runtime_version_id = $1
     ORDER BY question_id ASC, display_order ASC, option_id ASC`,
    [runtimeVersionId],
  )
  return result.rows
}

export async function getRuntimeV2MappingsForOptions(runtimeVersionId: string): Promise<RuntimeMappingRow[]> {
  const result = await queryDb<RuntimeMappingRow>(
    `SELECT id,
            runtime_version_id,
            option_id,
            question_id,
            signal_key,
            domain,
            weight,
            mapping_order
     FROM assessment_runtime_option_signal_mappings_v2
     WHERE runtime_version_id = $1
     ORDER BY question_id ASC, option_id ASC, mapping_order ASC`,
    [runtimeVersionId],
  )
  return result.rows
}

export async function hasMaterializedRuntimeV2(assessmentVersionId: string): Promise<boolean> {
  const row = await getMaterializedRuntimeVersionByAssessmentVersionId(assessmentVersionId)
  return Boolean(row)
}

export async function getMaterializationFingerprint(assessmentVersionId: string): Promise<Record<string, number> | null> {
  const runtime = await getMaterializedRuntimeVersionByAssessmentVersionId(assessmentVersionId)
  if (!runtime) {
    return null
  }

  const [questionSets, questions, options, mappings] = await Promise.all([
    getRuntimeV2QuestionSets(runtime.id),
    getRuntimeV2Questions(runtime.id),
    getRuntimeV2OptionsForQuestions(runtime.id),
    getRuntimeV2MappingsForOptions(runtime.id),
  ])

  const signalKeys = new Set(mappings.map((entry) => entry.signal_key))
  const domains = new Set(mappings.map((entry) => entry.domain).filter((entry): entry is string => typeof entry === 'string'))

  return {
    questionSetCount: questionSets.length,
    questionCount: questions.length,
    optionCount: options.length,
    mappingCount: mappings.length,
    signalCount: signalKeys.size,
    domainCount: domains.size,
  }
}

export async function getMaterializationStatusSummary(assessmentVersionId: string): Promise<{
  exists: boolean
  status: string | null
  publishStatus: string | null
}> {
  const runtime = await getMaterializedRuntimeVersionByAssessmentVersionId(assessmentVersionId)
  if (!runtime) {
    return { exists: false, status: null, publishStatus: null }
  }

  return {
    exists: true,
    status: runtime.materialization_status,
    publishStatus: runtime.publish_status,
  }
}


export async function getRuntimeV2AssessmentExecutionModelByVersionId(args: { assessmentVersionId: string }): Promise<RuntimeV2ExecutionModel | null> {
  const runtime = await getMaterializedRuntimeVersionByAssessmentVersionId(args.assessmentVersionId)
  if (!runtime) {
    return null
  }

  const [questionSets, questions, options, mappings] = await Promise.all([
    getRuntimeV2QuestionSets(runtime.id),
    getRuntimeV2Questions(runtime.id),
    getRuntimeV2OptionsForQuestions(runtime.id),
    getRuntimeV2MappingsForOptions(runtime.id),
  ])

  const optionsByQuestionId: Record<string, RuntimeOptionRow[]> = {}
  for (const option of options) {
    const list = optionsByQuestionId[option.question_id] ?? []
    list.push(option)
    optionsByQuestionId[option.question_id] = list
  }

  const mappingsByQuestionId: Record<string, RuntimeMappingRow[]> = {}
  for (const mapping of mappings) {
    const list = mappingsByQuestionId[mapping.question_id] ?? []
    list.push(mapping)
    mappingsByQuestionId[mapping.question_id] = list
  }

  return {
    runtimeVersionId: runtime.id,
    metadata: runtime.compiled_metadata_json,
    questionSets,
    questions,
    optionsByQuestionId,
    mappingsByQuestionId,
    signalRegistry: runtime.signal_registry_json,
    scoringConfig: runtime.compiled_scoring_config_json,
    normalizationConfig: runtime.compiled_normalization_config_json,
    outputConfig: runtime.compiled_output_config_json,
  }
}
export async function getRuntimeV2AssessmentExecutionModel(args: { definitionId: string }): Promise<RuntimeV2ExecutionModel | null> {
  const runtime = await getMaterializedRuntimeVersionForPublishedDefinition(args.definitionId)
  if (!runtime) {
    return null
  }

  const [questionSets, questions, options, mappings] = await Promise.all([
    getRuntimeV2QuestionSets(runtime.id),
    getRuntimeV2Questions(runtime.id),
    getRuntimeV2OptionsForQuestions(runtime.id),
    getRuntimeV2MappingsForOptions(runtime.id),
  ])

  const optionsByQuestionId: Record<string, RuntimeOptionRow[]> = {}
  for (const option of options) {
    const list = optionsByQuestionId[option.question_id] ?? []
    list.push(option)
    optionsByQuestionId[option.question_id] = list
  }

  const mappingsByQuestionId: Record<string, RuntimeMappingRow[]> = {}
  for (const mapping of mappings) {
    const list = mappingsByQuestionId[mapping.question_id] ?? []
    list.push(mapping)
    mappingsByQuestionId[mapping.question_id] = list
  }

  return {
    runtimeVersionId: runtime.id,
    metadata: runtime.compiled_metadata_json,
    questionSets,
    questions,
    optionsByQuestionId,
    mappingsByQuestionId,
    signalRegistry: runtime.signal_registry_json,
    scoringConfig: runtime.compiled_scoring_config_json,
    normalizationConfig: runtime.compiled_normalization_config_json,
    outputConfig: runtime.compiled_output_config_json,
  }
}
