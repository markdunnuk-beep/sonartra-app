import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('assessment entry route redirects via the shared lifecycle-aware resolver', async () => {
  const [routeSource, heroSource] = await Promise.all([
    readFile(new URL('../app/assessment-entry/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/hero/Hero.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(routeSource, /resolveAssessmentEntryRedirect/)
  assert.match(routeSource, /redirect\(await resolveAssessmentEntryRedirect\(\)\)/)
  assert.match(heroSource, /href="\/assessment-entry"/)
  assert.doesNotMatch(heroSource, /href="\/assessment"/)
})
