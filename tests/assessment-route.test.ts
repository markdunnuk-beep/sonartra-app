import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('assessment route resolves auth state before rendering the repository page', async () => {
  const source = await readFile(new URL('../app/assessment/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /resolveIndividualLifecycleState\(\)/)
  assert.match(source, /redirect\('\/sign-in'\)/)
  assert.match(source, /return <AssessmentPageClient \/>/)
})
