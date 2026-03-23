import test from 'node:test'
import assert from 'node:assert/strict'

import {
  APPLY_CONFIRMATION_TOKEN,
  buildAlignmentOperations,
  buildManualSqlPlan,
  buildVerificationChecks,
  DEFAULT_PRESERVED_ASSESSMENT_VERSION_KEYS,
  validateApplySafety,
} from '../lib/server/data-alignment'

test('default preserved assessment shell keys expose the repo baseline version', () => {
  assert.deepEqual(DEFAULT_PRESERVED_ASSESSMENT_VERSION_KEYS, ['wplp80-v1'])
  assert.equal(APPLY_CONFIRMATION_TOKEN, 'ALIGN_MVP_BASELINE')
})

test('alignment operations preserve owner user/admin identity while clearing dependent demo data', () => {
  const operations = buildAlignmentOperations({
    owner: {
      userId: 'user-1',
      email: 'owner@example.com',
      externalAuthId: 'clerk_owner',
      adminIdentityId: 'identity-1',
    },
    assessmentShell: {
      preserveVersionIds: ['version-1'],
      preserveDefinitionIds: ['definition-1'],
      preserveVersionKeys: ['wplp80-v1'],
    },
    preserveOrganisationIds: ['org-1'],
  })

  assert.match(operations.find((operation) => operation.key === 'delete_users_except_owner')!.sql, /delete from users where id <> \$1/i)
  assert.match(operations.find((operation) => operation.key === 'delete_admin_identities_except_owner')!.sql, /delete from admin_identities where id <> \$1/i)
  assert.match(operations.find((operation) => operation.key === 'scrub_preserved_assessment_versions')!.sql, /package_raw_payload = null/i)
  assert.match(operations.find((operation) => operation.key === 'delete_organisations_except_preserved')!.sql, /delete from organisations where id <> all\(\$1::uuid\[\]\)/i)
})

test('apply safety blocks deleting users without a resolved owner unless explicitly allowed', () => {
  assert.equal(
    validateApplySafety({
      owner: {
        userId: null,
        email: null,
        externalAuthId: null,
        adminIdentityId: null,
      },
      allowEmptyUsers: false,
    }).length,
    1,
  )

  assert.equal(
    validateApplySafety({
      owner: {
        userId: null,
        email: null,
        externalAuthId: null,
        adminIdentityId: null,
      },
      allowEmptyUsers: true,
    }).length,
    0,
  )
})

test('manual sql plan includes operation descriptions and parameter comments', () => {
  const sql = buildManualSqlPlan([
    {
      key: 'delete_users_except_owner',
      tableName: 'users',
      kind: 'delete',
      description: 'Delete app users except the preserved owner user row.',
      sql: 'delete from users where id <> $1',
      params: ['user-1'],
    },
  ])

  assert.match(sql, /Delete app users except the preserved owner user row\./)
  assert.match(sql, /params: \["user-1"\]/)
  assert.match(sql, /delete from users where id <> \$1;/i)
})

test('verification checks expect a single owner user and preserved assessment shell count', () => {
  const checks = buildVerificationChecks({
    owner: {
      userId: 'user-1',
      email: 'owner@example.com',
      externalAuthId: 'clerk_owner',
      adminIdentityId: 'identity-1',
    },
    assessmentShell: {
      preserveVersionIds: ['version-1'],
      preserveDefinitionIds: ['definition-1'],
      preserveVersionKeys: ['wplp80-v1'],
    },
    preserveOrganisationIds: [],
  })

  assert.equal(checks.find((check) => check.key === 'users_count')?.expectedValue, 1)
  assert.equal(checks.find((check) => check.key === 'owner_admin_identity_present')?.expectedValue, 1)
  assert.equal(checks.find((check) => check.key === 'preserved_version_count')?.expectedValue, 1)
})
