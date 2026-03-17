import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('dashboard view keeps pre-result copy progress-oriented and removes legacy demo intelligence phrases', async () => {
  const source = await readFile(new URL('../components/dashboard/DashboardPageView.tsx', import.meta.url), 'utf8')

  assert.match(source, /Assessment in progress/)
  assert.match(source, /Start assessment/)
  assert.match(source, /Resume assessment/)
  assert.match(source, /Individual Intelligence will become available once the assessment is completed/)
  assert.match(source, /assessmentHref = state\.assessment\.assessmentId \? `\/assessment\?assessmentId=\$\{encodeURIComponent\(state\.assessment\.assessmentId\)\}` : '\/assessment'/)

  assert.doesNotMatch(source, /Dominant Behaviour Style/)
  assert.doesNotMatch(source, /Leadership Architecture/)
  assert.doesNotMatch(source, /Stress Risk Index/)
})
