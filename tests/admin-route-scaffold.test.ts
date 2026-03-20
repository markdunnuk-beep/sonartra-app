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

test('admin dashboard uses release and audit framing rather than the generic governance label', async () => {
  const source = await readFile(new URL('../app/admin/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /Review release queue/)
  assert.match(source, /Check audit evidence trail/)
  assert.doesNotMatch(source, /Review assessment registry/)
})

test('legacy governance route redirects into the release workflow surface', async () => {
  const source = await readFile(new URL('../app/admin/governance/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /redirect\('\/admin\/releases'\)/)
})
