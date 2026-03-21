import assert from 'node:assert/strict'
import test from 'node:test'

import { ProvisionalAdminRole } from '../lib/admin/domain'
import { getAdminNavigationItems } from '../lib/admin/navigation'

const access = {
  isAuthenticated: true,
  isAllowed: true,
  email: 'ops@sonartra.com',
  allowlist: ['ops@sonartra.com'],
  accessSource: 'email_allowlist' as const,
  provisionalRole: ProvisionalAdminRole.InternalAdmin,
  provisionalAccess: {
    role: ProvisionalAdminRole.InternalAdmin,
    rationale: 'bootstrap_allowlist' as const,
  },
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

  assert.equal(items.every((item) => item.compatibleProvisionalRoles.includes(ProvisionalAdminRole.InternalAdmin)), true)
  assert.equal(items.every((item) => item.requiredRoles.length > 0), true)
  assert.equal(items.every((item) => item.requiredCapabilities.length > 0), true)
})


test('assessment navigation item points to the canonical assessments route', () => {
  const assessmentItem = getAdminNavigationItems(access).find((item) => item.label === 'Assessments')

  assert.equal(assessmentItem?.href, '/admin/assessments')
  assert.equal(assessmentItem?.startsWith, '/admin/assessments')
})
