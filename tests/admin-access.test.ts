import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAdminAccessContext, getConfiguredAdminEmails } from '../lib/admin/access'

test('getConfiguredAdminEmails normalises and filters the internal admin allowlist', () => {
  const allowlist = getConfiguredAdminEmails({
    SONARTRA_ADMIN_EMAILS: ' Admin@One.com,ops@sonartra.com ,, security@sonartra.com ',
  })

  assert.deepEqual(allowlist, ['admin@one.com', 'ops@sonartra.com', 'security@sonartra.com'])
})

test('buildAdminAccessContext returns provisional internal admin context when the allowlist matches', () => {
  const access = buildAdminAccessContext({
    isAuthenticated: true,
    email: 'ops@sonartra.com',
    allowlist: ['ops@sonartra.com'],
  })

  assert.deepEqual(access, {
    isAuthenticated: true,
    isAllowed: true,
    email: 'ops@sonartra.com',
    allowlist: ['ops@sonartra.com'],
    accessSource: 'email_allowlist',
    provisionalRole: 'internal_admin',
    provisionalAccess: {
      role: 'internal_admin',
      rationale: 'bootstrap_allowlist',
    },
  })
})

test('buildAdminAccessContext keeps authenticated but unmatched users outside the admin surface', () => {
  const access = buildAdminAccessContext({
    isAuthenticated: true,
    email: 'member@example.com',
    allowlist: ['ops@sonartra.com'],
  })

  assert.equal(access.isAuthenticated, true)
  assert.equal(access.isAllowed, false)
  assert.equal(access.accessSource, 'none')
  assert.equal(access.provisionalRole, null)
  assert.equal(access.provisionalAccess, null)
})
