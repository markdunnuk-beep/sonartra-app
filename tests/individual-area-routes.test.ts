import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('legacy assessment route redirects into individual assessments forward path', async () => {
  const source = await readFile(new URL('../app/assessment/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /redirect\('\/individual\/assessments'\)/)
  assert.match(source, /Transitional compatibility route/)
})

test('individual assessments page uses dedicated assessments view-model contract', async () => {
  const source = await readFile(new URL('../app/individual/assessments/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /loadIndividualAssessmentsViewModel/)
  assert.doesNotMatch(source, /loadIndividualResultsViewModel/)
  assert.doesNotMatch(source, /IndividualIntelligenceResultView/)
})

test('individual results page uses persisted results list contract', async () => {
  const source = await readFile(new URL('../app/individual/results/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /loadIndividualResultsViewModel/)
  assert.doesNotMatch(source, /loadLiveAssessmentRepositoryInventory/)
})

test('individual result detail page resolves by result id and renders via existing result adapter view', async () => {
  const source = await readFile(new URL('../app/individual/results/[resultId]/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /loadIndividualResultDetailById\(params\.resultId\)/)
  assert.match(source, /IndividualIntelligenceResultView/)
})

test('individual result detail loader reuses canonical individual-like category predicate', async () => {
  const source = await readFile(new URL('../lib/server/individual-result-detail.ts', import.meta.url), 'utf8')

  assert.match(source, /buildIndividualResultsCategorySqlPredicate/)
})

test('legacy individual results route explicitly redirects to the new individual results section', async () => {
  const source = await readFile(new URL('../app/results/individual/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /redirect\('\/individual\/results'\)/)
  assert.match(source, /Transitional compatibility route/)
})
