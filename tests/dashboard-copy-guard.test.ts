import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('dashboard pre-result copy remains progress-oriented and lifecycle presentation copy is centralized', async () => {
  const viewSource = await readFile(new URL('../components/dashboard/DashboardPageView.tsx', import.meta.url), 'utf8')
  const mapperSource = await readFile(new URL('../lib/lifecycle-presentation.ts', import.meta.url), 'utf8')

  assert.match(viewSource, /Assessment in progress/)
  assert.match(viewSource, /Individual Intelligence availability follows assessment completion and persisted result readiness/)

  assert.match(mapperSource, /Start assessment/)
  assert.match(mapperSource, /Resume assessment/)
  assert.match(mapperSource, /Completed — results pending/)
  assert.match(mapperSource, /Results available/)

  assert.doesNotMatch(viewSource, /Dominant Behaviour Style/)
  assert.doesNotMatch(viewSource, /Leadership Architecture/)
  assert.doesNotMatch(viewSource, /Stress Risk Index/)
})
