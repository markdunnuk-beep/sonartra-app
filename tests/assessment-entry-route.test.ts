import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('direct Signals entry surfaces the shared canonical workspace route across public and repository launch paths', async () => {
  const [routeSource, heroSource, signalsSource, catalogueSource] = await Promise.all([
    readFile(new URL('../app/assessment-entry/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/hero/Hero.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/signals/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/assessment/assessment-catalogue-config.ts', import.meta.url), 'utf8'),
  ])

  assert.match(routeSource, /resolveAssessmentEntryRedirect/)
  assert.match(routeSource, /redirect\(await resolveAssessmentEntryRedirect\(\)\)/)
  assert.match(heroSource, /SIGNALS_ASSESSMENT_WORKSPACE_PATH/)
  assert.match(signalsSource, /SIGNALS_ASSESSMENT_WORKSPACE_PATH/)
  assert.match(catalogueSource, /SIGNALS_ASSESSMENT_WORKSPACE_PATH/)
  assert.doesNotMatch(heroSource, /href="\/assessment-entry"/)
})
