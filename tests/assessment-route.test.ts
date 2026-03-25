import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('legacy assessment route now redirects to individual assessments route', async () => {
  const source = await readFile(new URL('../app/assessment/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /redirect\('\/individual\/assessments'\)/)
})
