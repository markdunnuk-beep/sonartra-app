import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('dashboard pre-result copy is lifecycle-driven from shared mapper', async () => {
  const viewSource = await readFile(new URL('../components/dashboard/DashboardPageView.tsx', import.meta.url), 'utf8')
  const mapperSource = await readFile(new URL('../lib/lifecycle-presentation.ts', import.meta.url), 'utf8')

  assert.match(viewSource, /presentation\.dashboardDetailTitle/)
  assert.match(viewSource, /presentation\.dashboardDetailBody/)
  assert.match(viewSource, /presentation\.dashboardDetailFootnote/)
  assert.match(viewSource, /presentation\.dashboardActionLabel && presentation\.dashboardActionHref/)
  assert.match(viewSource, /Next Actions/)
  assert.match(viewSource, /Key Signals Snapshot/)
  assert.match(viewSource, /Intelligence Coverage/)

  assert.match(mapperSource, /Assessment not started/)
  assert.match(mapperSource, /Assessment in progress/)
  assert.match(mapperSource, /Assessment completed/)
  assert.match(mapperSource, /Results available/)
  assert.match(mapperSource, /Results unavailable/)

  assert.doesNotMatch(viewSource, /Track completion status and continue to unlock Individual Intelligence\./)
  assert.doesNotMatch(viewSource, /Continue assessment to unlock behavioural, leadership, and operating insights\./)
  assert.doesNotMatch(viewSource, /Dominant Behaviour Style/)
  assert.doesNotMatch(viewSource, /Leadership Architecture/)
  assert.doesNotMatch(viewSource, /Stress Risk Index/)
  assert.doesNotMatch(viewSource, /Individual Intelligence Overview/)
})
