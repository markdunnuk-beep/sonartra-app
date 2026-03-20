import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('admin layout redirects unauthenticated users and gates unauthorized access', async () => {
  const source = await readFile(new URL('../app/admin/layout.tsx', import.meta.url), 'utf8')

  assert.match(source, /resolveAdminAccess/)
  assert.match(source, /getAdminNavigationItems/)
  assert.match(source, /redirect\('\/sign-in'\)/)
  assert.match(source, /!access\.isAllowed/)
  assert.match(source, /AdminShell access=\{access\} navigationItems=\{getAdminNavigationItems\(access\)\}/)
})

test('admin dashboard uses release, audit, and action-required framing rather than the generic governance label', async () => {
  const source = await readFile(new URL('../app/admin/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /AdminDashboardWireframePage/)
})

test('legacy governance route redirects into the release workflow surface', async () => {
  const source = await readFile(new URL('../app/admin/governance/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /redirect\('\/admin\/releases'\)/)
})

test('admin dashboard alias route resolves to the shared dashboard surface', async () => {
  const source = await readFile(new URL('../app/admin/dashboard/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /AdminDashboardWireframePage/)
})
