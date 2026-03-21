import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('version detail surface and release controls source include release governance UI affordances', async () => {
  const [detailSource, controlsSource] = await Promise.all([
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionDetailSurface.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionReleaseControls.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(detailSource, /Release control/)
  assert.match(detailSource, /Publish gating/)
  assert.match(detailSource, /Release notes preview/)
  assert.match(controlsSource, /Run readiness check/)
  assert.match(controlsSource, /Sign off version/)
  assert.match(controlsSource, /Save release notes/)
})
