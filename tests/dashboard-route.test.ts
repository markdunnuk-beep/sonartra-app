import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('dashboard route uses authenticated workspace view and keeps unauthenticated redirect', async () => {
  const source = await readFile(new URL('../app/dashboard/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /DashboardPageView/)
  assert.match(source, /getAuthenticatedDashboardState/)
  assert.match(source, /redirect\('\/sign-in'\)/)
  assert.doesNotMatch(source, /dashboardSummary/)
  assert.doesNotMatch(source, /individualResults/)
})

test('dashboard workspace view is wrapped in AppShell', async () => {
  const source = await readFile(new URL('../components/dashboard/DashboardPageView.tsx', import.meta.url), 'utf8')

  const appShellCount = (source.match(/<AppShell>/g) ?? []).length
  assert.equal(appShellCount, 1)
})
