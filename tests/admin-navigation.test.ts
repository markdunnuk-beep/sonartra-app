import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdminNavigationItems } from '../lib/admin/navigation'

const access = {
  isAuthenticated: true,
  isAllowed: true,
  email: 'ops@sonartra.com',
  allowlist: ['ops@sonartra.com'],
  accessSource: 'email_allowlist' as const,
  provisionalRole: 'internal_admin' as const,
}

test('admin navigation scaffold covers the primary administrator modules', () => {
  const labels = getAdminNavigationItems(access).map((item) => item.label)

  assert.deepEqual(labels, ['Dashboard', 'Organisations', 'Users', 'Assessments', 'Releases', 'Audit'])
})

test('admin navigation routes remain scoped to the admin control surface', () => {
  assert.equal(getAdminNavigationItems(access).every((item) => item.href.startsWith('/admin')), true)
})

test('admin navigation items expose permission-ready metadata', () => {
  const items = getAdminNavigationItems(access)

  assert.equal(items.every((item) => item.requiredRoles.includes('internal_admin')), true)
  assert.equal(items.every((item) => item.requiredCapabilities.length > 0), true)
})
