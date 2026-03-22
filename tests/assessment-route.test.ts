import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('assessment route resolves auth state and live repository inventory before rendering the repository page', async () => {
  const source = await readFile(new URL('../app/assessment/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /resolveAuthenticatedAppUser\(\)/)
  assert.match(source, /loadLiveAssessmentRepositoryInventory\(appUser\.dbUserId\)/)
  assert.match(source, /redirect\('\/sign-in'\)/)
  assert.match(source, /return <AssessmentPageClient inventory=\{inventory\} \/>/)
})

test('assessment page client forwards the server inventory into the repository shell', async () => {
  const source = await readFile(new URL('../app/assessment/AssessmentPageClient.tsx', import.meta.url), 'utf8')

  assert.match(source, /export default function AssessmentPageClient\(\{ inventory \}: \{ inventory: AssessmentRepositoryItem\[\] \}\)/)
  assert.match(source, /<AssessmentRepositoryPage inventory=\{inventory\} \/>/)
})
