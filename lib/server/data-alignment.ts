import type { QueryResultRow } from 'pg'

export type DataAlignmentCategory =
  | 'protected_governance'
  | 'auth_linkage'
  | 'user_org_state'
  | 'assessment_runtime'
  | 'assessment_content'

export interface DataAlignmentTableDefinition {
  tableName: string
  category: DataAlignmentCategory
  description: string
  safeAction: string
  references?: string[]
}

export interface ResolvedOwnerContext {
  userId: string | null
  email: string | null
  externalAuthId: string | null
  adminIdentityId: string | null
}

export interface AssessmentShellContext {
  preserveVersionIds: string[]
  preserveDefinitionIds: string[]
  preserveVersionKeys: string[]
}

export interface AlignmentOperation {
  key: string
  tableName: string
  kind: 'delete' | 'update'
  description: string
  sql: string
  params: unknown[]
}

export interface AlignmentVerificationCheck {
  key: string
  description: string
  sql: string
  params: unknown[]
  expectedValue: number
}

export interface BuildAlignmentOperationsInput {
  owner: ResolvedOwnerContext
  assessmentShell: AssessmentShellContext
  preserveOrganisationIds?: string[]
}

export const DEFAULT_PRESERVED_ASSESSMENT_VERSION_KEYS = ['wplp80-v1'] as const
export const APPLY_CONFIRMATION_TOKEN = 'ALIGN_MVP_BASELINE'

export const DATA_ALIGNMENT_TABLES: DataAlignmentTableDefinition[] = [
  {
    tableName: 'schema_migrations',
    category: 'protected_governance',
    description: 'Migration history and governance ledger.',
    safeAction: 'Never modify or delete from this table.',
  },
  {
    tableName: 'admin_roles',
    category: 'protected_governance',
    description: 'Static role catalogue seeded by migrations.',
    safeAction: 'Keep intact; runtime/admin rows reference these immutable role definitions.',
  },
  {
    tableName: 'users',
    category: 'auth_linkage',
    description: 'Application user records keyed to Clerk via external_auth_id.',
    safeAction: 'Preserve the real owner user row so sign-in can reconcile by email or external_auth_id.',
  },
  {
    tableName: 'admin_identities',
    category: 'auth_linkage',
    description: 'Admin access registry identities and auth bindings.',
    safeAction: 'Preserve or rehydrate the real owner identity carefully; clear demo identities only.',
    references: ['users'],
  },
  {
    tableName: 'admin_identity_roles',
    category: 'auth_linkage',
    description: 'Role assignments for admin identities.',
    safeAction: 'Clear demo role assignments; optionally preserve owner internal role bindings.',
    references: ['admin_identities', 'admin_roles', 'organisations'],
  },
  {
    tableName: 'organisation_memberships',
    category: 'auth_linkage',
    description: 'Admin-facing organisation membership registry.',
    safeAction: 'Clear and later rebuild from preserved business rows if required.',
    references: ['admin_identities', 'organisations'],
  },
  {
    tableName: 'access_audit_events',
    category: 'auth_linkage',
    description: 'Admin audit/event log rows visible in admin.',
    safeAction: 'Safe to clear for a clean MVP baseline after exporting first.',
    references: ['admin_identities', 'organisations'],
  },
  {
    tableName: 'organisation_members',
    category: 'user_org_state',
    description: 'Legacy app-side organisation membership rows.',
    safeAction: 'Delete demo memberships before deleting demo organisations.',
    references: ['organisations', 'users'],
  },
  {
    tableName: 'organisations',
    category: 'user_org_state',
    description: 'Legacy app-side organisation records.',
    safeAction: 'Delete demo organisations unless an explicit baseline organisation is being preserved.',
  },
  {
    tableName: 'assessment_result_signals',
    category: 'assessment_runtime',
    description: 'Atomic signal outputs for persisted result snapshots.',
    safeAction: 'Delete first among assessment runtime descendants.',
    references: ['assessment_results'],
  },
  {
    tableName: 'assessment_results',
    category: 'assessment_runtime',
    description: 'Persisted assessment result snapshots.',
    safeAction: 'Delete after child signal rows and before parent assessments only if not relying on cascades.',
    references: ['assessments', 'assessment_versions'],
  },
  {
    tableName: 'assessment_score_snapshots',
    category: 'assessment_runtime',
    description: 'Legacy score snapshot rows.',
    safeAction: 'Delete before parent assessments for explicit auditability.',
    references: ['assessments'],
  },
  {
    tableName: 'assessment_responses',
    category: 'assessment_runtime',
    description: 'Per-question assessment answers.',
    safeAction: 'Delete before parent assessments for explicit auditability.',
    references: ['assessments'],
  },
  {
    tableName: 'assessments',
    category: 'assessment_runtime',
    description: 'Assessment attempt/runtime rows.',
    safeAction: 'Delete all attempts to remove dummy runtime state.',
    references: ['users', 'organisations', 'assessment_versions'],
  },
  {
    tableName: 'assessment_saved_scenarios',
    category: 'assessment_content',
    description: 'Definition/version-scoped saved scenarios used for QA or regression.',
    safeAction: 'Clear before version/definition cleanup.',
    references: ['assessment_definitions', 'assessment_versions', 'admin_identities'],
  },
  {
    tableName: 'assessment_version_saved_scenarios',
    category: 'assessment_content',
    description: 'Version-scoped scenario workspace rows visible in admin.',
    safeAction: 'Clear before deleting assessment versions.',
    references: ['assessment_versions', 'admin_identities'],
  },
  {
    tableName: 'assessment_option_signal_mappings',
    category: 'assessment_content',
    description: 'Question-option signal mappings for runtime/question bank materialization.',
    safeAction: 'Clear before options/questions/question sets.',
    references: ['assessment_question_options'],
  },
  {
    tableName: 'assessment_question_options',
    category: 'assessment_content',
    description: 'Question bank options for materialized runtime/question sets.',
    safeAction: 'Clear before questions/question sets.',
    references: ['assessment_questions'],
  },
  {
    tableName: 'assessment_questions',
    category: 'assessment_content',
    description: 'Question bank questions for materialized runtime/question sets.',
    safeAction: 'Clear before question sets.',
    references: ['assessment_question_sets'],
  },
  {
    tableName: 'assessment_question_sets',
    category: 'assessment_content',
    description: 'Runtime/materialized question set headers.',
    safeAction: 'Clear before deleting or scrubbing assessment versions.',
    references: ['assessment_versions'],
  },
  {
    tableName: 'assessment_versions',
    category: 'assessment_content',
    description: 'Version rows for package imports and legacy baseline shells.',
    safeAction: 'Delete non-baseline/demo versions; scrub any intentionally preserved baseline shell rows.',
    references: ['assessment_definitions', 'admin_identities'],
  },
  {
    tableName: 'assessment_definitions',
    category: 'assessment_content',
    description: 'Assessment catalogue definitions shown in admin.',
    safeAction: 'Delete non-baseline/demo definitions; leave only intentional shells if preserving one.',
    references: ['assessment_versions', 'admin_identities'],
  },
]

export function getTablesByCategory(category: DataAlignmentCategory): DataAlignmentTableDefinition[] {
  return DATA_ALIGNMENT_TABLES.filter((entry) => entry.category === category)
}

export function buildBackupGuidance(): string[] {
  return [
    '1. Export data-only backups before any destructive run.',
    '2. Capture at least users/admin/org tables and all assessment runtime/content tables.',
    '3. Save a schema-only dump separately for forensic comparison, even though this tool never changes schema.',
    '4. Review the dry-run report and SQL plan with the owner identifiers filled in before using --apply.',
    '',
    'Example commands:',
    '  pg_dump "$DATABASE_URL" --data-only --column-inserts --table=public.users --table=public.organisations --table=public.organisation_members > backup-users-orgs.sql',
    '  pg_dump "$DATABASE_URL" --data-only --column-inserts --table=public.admin_identities --table=public.admin_identity_roles --table=public.organisation_memberships --table=public.access_audit_events > backup-admin-registry.sql',
    '  pg_dump "$DATABASE_URL" --data-only --column-inserts --table=public.assessments --table=public.assessment_responses --table=public.assessment_results --table=public.assessment_result_signals --table=public.assessment_score_snapshots > backup-assessment-runtime.sql',
    '  pg_dump "$DATABASE_URL" --data-only --column-inserts --table=public.assessment_definitions --table=public.assessment_versions --table=public.assessment_question_sets --table=public.assessment_questions --table=public.assessment_question_options --table=public.assessment_option_signal_mappings --table=public.assessment_saved_scenarios --table=public.assessment_version_saved_scenarios > backup-assessment-content.sql',
    '  pg_dump "$DATABASE_URL" --schema-only > backup-schema.sql',
  ]
}

export function validateApplySafety(input: {
  owner: ResolvedOwnerContext
  allowEmptyUsers: boolean
}): string[] {
  const problems: string[] = []

  if (!input.allowEmptyUsers && !input.owner.userId) {
    problems.push('Refusing to delete from users without a resolved owner user. Provide --owner-email, --owner-user-id, or --owner-external-auth-id, or explicitly pass --allow-empty-users.')
  }

  return problems
}
function buildVersionPreservationCondition(ids: string[]): { clause: string; params: unknown[] } {
  if (!ids.length) {
    return { clause: 'TRUE', params: [] }
  }

  return {
    clause: 'id <> ALL($1::uuid[])',
    params: [ids],
  }
}

export function buildAlignmentOperations(input: BuildAlignmentOperationsInput): AlignmentOperation[] {
  const preserveOrganisationIds = Array.from(new Set((input.preserveOrganisationIds ?? []).filter(Boolean)))
  const preserveVersionIds = Array.from(new Set(input.assessmentShell.preserveVersionIds.filter(Boolean)))
  const preserveDefinitionIds = Array.from(new Set(input.assessmentShell.preserveDefinitionIds.filter(Boolean)))
  const operations: AlignmentOperation[] = [
    {
      key: 'delete_assessment_result_signals',
      tableName: 'assessment_result_signals',
      kind: 'delete',
      description: 'Clear assessment result signal rows first.',
      sql: 'delete from assessment_result_signals',
      params: [],
    },
    {
      key: 'delete_assessment_results',
      tableName: 'assessment_results',
      kind: 'delete',
      description: 'Clear persisted assessment result snapshots.',
      sql: 'delete from assessment_results',
      params: [],
    },
    {
      key: 'delete_assessment_score_snapshots',
      tableName: 'assessment_score_snapshots',
      kind: 'delete',
      description: 'Clear legacy score snapshot rows.',
      sql: 'delete from assessment_score_snapshots',
      params: [],
    },
    {
      key: 'delete_assessment_responses',
      tableName: 'assessment_responses',
      kind: 'delete',
      description: 'Clear persisted assessment responses.',
      sql: 'delete from assessment_responses',
      params: [],
    },
    {
      key: 'delete_assessments',
      tableName: 'assessments',
      kind: 'delete',
      description: 'Clear assessment attempts/runtime rows.',
      sql: 'delete from assessments',
      params: [],
    },
    {
      key: 'delete_assessment_saved_scenarios',
      tableName: 'assessment_saved_scenarios',
      kind: 'delete',
      description: 'Clear saved scenario rows tied to definitions/versions.',
      sql: 'delete from assessment_saved_scenarios',
      params: [],
    },
    {
      key: 'delete_assessment_version_saved_scenarios',
      tableName: 'assessment_version_saved_scenarios',
      kind: 'delete',
      description: 'Clear version workspace scenario rows.',
      sql: 'delete from assessment_version_saved_scenarios',
      params: [],
    },
    {
      key: 'delete_assessment_option_signal_mappings',
      tableName: 'assessment_option_signal_mappings',
      kind: 'delete',
      description: 'Clear option-level signal mappings.',
      sql: 'delete from assessment_option_signal_mappings',
      params: [],
    },
    {
      key: 'delete_assessment_question_options',
      tableName: 'assessment_question_options',
      kind: 'delete',
      description: 'Clear materialized question options.',
      sql: 'delete from assessment_question_options',
      params: [],
    },
    {
      key: 'delete_assessment_questions',
      tableName: 'assessment_questions',
      kind: 'delete',
      description: 'Clear materialized questions.',
      sql: 'delete from assessment_questions',
      params: [],
    },
    {
      key: 'delete_assessment_question_sets',
      tableName: 'assessment_question_sets',
      kind: 'delete',
      description: 'Clear materialized question sets/runtime shells.',
      sql: 'delete from assessment_question_sets',
      params: [],
    },
    {
      key: 'delete_access_audit_events',
      tableName: 'access_audit_events',
      kind: 'delete',
      description: 'Clear admin audit events after export.',
      sql: 'delete from access_audit_events',
      params: [],
    },
  ]

  if (input.owner.adminIdentityId) {
    operations.push({
      key: 'delete_admin_identity_roles_except_owner_internal',
      tableName: 'admin_identity_roles',
      kind: 'delete',
      description: 'Delete demo admin role assignments while preserving only owner internal assignments.',
      sql: `delete from admin_identity_roles
            where identity_id <> $1
               or organisation_id is not null`,
      params: [input.owner.adminIdentityId],
    })
  } else {
    operations.push({
      key: 'delete_admin_identity_roles',
      tableName: 'admin_identity_roles',
      kind: 'delete',
      description: 'Delete all admin role assignments.',
      sql: 'delete from admin_identity_roles',
      params: [],
    })
  }

  if (input.owner.adminIdentityId && preserveOrganisationIds.length) {
    operations.push({
      key: 'delete_organisation_memberships_except_preserved',
      tableName: 'organisation_memberships',
      kind: 'delete',
      description: 'Delete organisation membership registry rows except explicitly preserved owner/org links.',
      sql: `delete from organisation_memberships
            where identity_id <> $1
               or organisation_id <> all($2::uuid[])`,
      params: [input.owner.adminIdentityId, preserveOrganisationIds],
    })
  } else {
    operations.push({
      key: 'delete_organisation_memberships',
      tableName: 'organisation_memberships',
      kind: 'delete',
      description: 'Delete all admin-side organisation membership rows.',
      sql: 'delete from organisation_memberships',
      params: [],
    })
  }

  if (input.owner.adminIdentityId) {
    operations.push({
      key: 'delete_admin_identities_except_owner',
      tableName: 'admin_identities',
      kind: 'delete',
      description: 'Delete admin identities except the preserved owner identity.',
      sql: 'delete from admin_identities where id <> $1',
      params: [input.owner.adminIdentityId],
    })
  } else {
    operations.push({
      key: 'delete_admin_identities',
      tableName: 'admin_identities',
      kind: 'delete',
      description: 'Delete all admin identities so they can be rehydrated deliberately.',
      sql: 'delete from admin_identities',
      params: [],
    })
  }

  if (input.owner.userId && preserveOrganisationIds.length) {
    operations.push({
      key: 'delete_organisation_members_except_preserved',
      tableName: 'organisation_members',
      kind: 'delete',
      description: 'Delete legacy organisation memberships except explicitly preserved owner/org links.',
      sql: `delete from organisation_members
            where user_id <> $1
               or organisation_id <> all($2::uuid[])`,
      params: [input.owner.userId, preserveOrganisationIds],
    })
  } else {
    operations.push({
      key: 'delete_organisation_members',
      tableName: 'organisation_members',
      kind: 'delete',
      description: 'Delete all legacy organisation membership rows.',
      sql: 'delete from organisation_members',
      params: [],
    })
  }

  if (preserveOrganisationIds.length) {
    operations.push({
      key: 'delete_organisations_except_preserved',
      tableName: 'organisations',
      kind: 'delete',
      description: 'Delete demo organisations except explicitly preserved baseline organisations.',
      sql: 'delete from organisations where id <> all($1::uuid[])',
      params: [preserveOrganisationIds],
    })
  } else {
    operations.push({
      key: 'delete_organisations',
      tableName: 'organisations',
      kind: 'delete',
      description: 'Delete all organisation rows for a no-demo baseline.',
      sql: 'delete from organisations',
      params: [],
    })
  }

  const versionDelete = buildVersionPreservationCondition(preserveVersionIds)
  operations.push({
    key: 'delete_assessment_versions_except_preserved',
    tableName: 'assessment_versions',
    kind: 'delete',
    description: preserveVersionIds.length
      ? 'Delete imported/demo assessment versions while preserving requested baseline shell versions.'
      : 'Delete all assessment versions.',
    sql: `delete from assessment_versions where ${versionDelete.clause}`,
    params: versionDelete.params,
  })

  if (preserveVersionIds.length) {
    operations.push({
      key: 'scrub_preserved_assessment_versions',
      tableName: 'assessment_versions',
      kind: 'update',
      description: 'Scrub preserved baseline assessment shell rows back to a clean pre-import state.',
      sql: `update assessment_versions
            set is_active = false,
                lifecycle_status = 'draft',
                published_by_identity_id = null,
                published_at = null,
                archived_at = null,
                definition_payload = null,
                import_metadata_json = '{}'::jsonb,
                validation_status = null,
                package_raw_payload = null,
                package_schema_version = null,
                package_status = 'missing',
                package_source_type = null,
                package_source_filename = null,
                package_imported_at = null,
                package_imported_by_identity_id = null,
                package_validation_report_json = '{}'::jsonb,
                latest_regression_suite_snapshot_json = null,
                publish_readiness_status = 'not_ready',
                readiness_check_summary_json = null,
                last_readiness_evaluated_at = null,
                sign_off_status = 'unsigned',
                sign_off_by_identity_id = null,
                sign_off_at = null,
                sign_off_material_updated_at = null,
                release_notes = null,
                material_updated_at = now(),
                updated_at = now()
            where id = any($1::uuid[])`,
      params: [preserveVersionIds],
    })
  }

  const definitionDelete = buildVersionPreservationCondition(preserveDefinitionIds)
  operations.push({
    key: 'delete_assessment_definitions_except_preserved',
    tableName: 'assessment_definitions',
    kind: 'delete',
    description: preserveDefinitionIds.length
      ? 'Delete imported/demo assessment definitions while preserving baseline shells referenced by preserved versions.'
      : 'Delete all assessment definitions.',
    sql: `delete from assessment_definitions where ${definitionDelete.clause}`,
    params: definitionDelete.params,
  })

  if (preserveDefinitionIds.length) {
    operations.push({
      key: 'scrub_preserved_assessment_definitions',
      tableName: 'assessment_definitions',
      kind: 'update',
      description: 'Scrub preserved baseline assessment definition shells back to draft/unpublished.',
      sql: `update assessment_definitions
            set lifecycle_status = 'draft',
                current_published_version_id = null,
                settings_json = '{}'::jsonb,
                import_metadata_json = '{}'::jsonb,
                updated_by_identity_id = null,
                updated_at = now()
            where id = any($1::uuid[])`,
      params: [preserveDefinitionIds],
    })
  }

  if (input.owner.userId) {
    operations.push({
      key: 'delete_users_except_owner',
      tableName: 'users',
      kind: 'delete',
      description: 'Delete app users except the preserved owner user row.',
      sql: 'delete from users where id <> $1',
      params: [input.owner.userId],
    })
  } else {
    operations.push({
      key: 'delete_users',
      tableName: 'users',
      kind: 'delete',
      description: 'Delete all app users. Only use this when intentionally rehydrating from zero.',
      sql: 'delete from users',
      params: [],
    })
  }

  return operations
}

export function buildVerificationChecks(input: BuildAlignmentOperationsInput): AlignmentVerificationCheck[] {
  const checks: AlignmentVerificationCheck[] = [
    {
      key: 'assessment_runtime_empty',
      description: 'Assessment runtime tables should be empty.',
      sql: `select (
              (select count(*) from assessment_result_signals)
            + (select count(*) from assessment_results)
            + (select count(*) from assessment_score_snapshots)
            + (select count(*) from assessment_responses)
            + (select count(*) from assessments)
            )::int as count`,
      params: [],
      expectedValue: 0,
    },
    {
      key: 'assessment_materialization_empty',
      description: 'Materialized question bank/runtime tables should be empty.',
      sql: `select (
              (select count(*) from assessment_option_signal_mappings)
            + (select count(*) from assessment_question_options)
            + (select count(*) from assessment_questions)
            + (select count(*) from assessment_question_sets)
            + (select count(*) from assessment_saved_scenarios)
            + (select count(*) from assessment_version_saved_scenarios)
            )::int as count`,
      params: [],
      expectedValue: 0,
    },
    {
      key: 'organisations_count',
      description: 'Only explicitly preserved organisations should remain.',
      sql: 'select count(*)::int as count from organisations',
      params: [],
      expectedValue: (input.preserveOrganisationIds ?? []).length,
    },
    {
      key: 'users_count',
      description: 'Only the preserved owner user should remain unless an empty-user reset was intentional.',
      sql: 'select count(*)::int as count from users',
      params: [],
      expectedValue: input.owner.userId ? 1 : 0,
    },
  ]

  if (input.owner.userId) {
    checks.push({
      key: 'owner_user_present',
      description: 'Preserved owner user row should still exist.',
      sql: 'select count(*)::int as count from users where id = $1',
      params: [input.owner.userId],
      expectedValue: 1,
    })
  }

  if (input.owner.adminIdentityId) {
    checks.push({
      key: 'owner_admin_identity_present',
      description: 'Preserved owner admin identity should still exist.',
      sql: 'select count(*)::int as count from admin_identities where id = $1',
      params: [input.owner.adminIdentityId],
      expectedValue: 1,
    })
  }

  if (input.assessmentShell.preserveVersionIds.length) {
    checks.push({
      key: 'preserved_version_count',
      description: 'Only the preserved baseline assessment shell versions should remain.',
      sql: 'select count(*)::int as count from assessment_versions',
      params: [],
      expectedValue: input.assessmentShell.preserveVersionIds.length,
    })
  }

  return checks
}

export function buildManualSqlPlan(operations: AlignmentOperation[]): string {
  return operations
    .map((operation, index) => {
      const paramComment = operation.params.length
        ? `-- params: ${JSON.stringify(operation.params)}`
        : '-- params: []'

      return [
        `-- ${index + 1}. ${operation.description}`,
        paramComment,
        `${operation.sql.trim().replace(/\n\s+/g, '\n')} ;`.replace(' ;', ';'),
      ].join('\n')
    })
    .join('\n\n')
}

export async function fetchForeignKeyDependencyMap(
  queryDb: <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>,
  tableNames: string[],
) {
  return queryDb<{
    source_table: string
    target_table: string
    constraint_name: string
    delete_rule: string
  }>(
    `select
       tc.table_name as source_table,
       ccu.table_name as target_table,
       tc.constraint_name,
       rc.delete_rule
     from information_schema.table_constraints tc
     inner join information_schema.key_column_usage kcu
       on tc.constraint_name = kcu.constraint_name
      and tc.table_schema = kcu.table_schema
     inner join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema = tc.table_schema
     inner join information_schema.referential_constraints rc
       on rc.constraint_name = tc.constraint_name
      and rc.constraint_schema = tc.table_schema
     where tc.constraint_type = 'FOREIGN KEY'
       and tc.table_schema = current_schema()
       and tc.table_name = any($1::text[])
       and ccu.table_name = any($1::text[])
     order by tc.table_name asc, ccu.table_name asc, tc.constraint_name asc`,
    [tableNames],
  )
}
