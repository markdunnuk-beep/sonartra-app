import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('version detail surface and release controls source use simplified operator workflow copy', async () => {
  const [detailSource, controlsSource] = await Promise.all([
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionDetailSurface.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionReleaseControls.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(detailSource, /Review this version before publishing\./)
  assert.match(detailSource, /Version actions/)
  assert.match(detailSource, /Package summary/)
  assert.match(detailSource, /Recent activity/)
  assert.doesNotMatch(detailSource, /Release control/)
  assert.doesNotMatch(detailSource, /Latest regression suite snapshot/)
  assert.doesNotMatch(detailSource, /Diff/)
  assert.doesNotMatch(detailSource, /Validation evidence/)
  assert.match(controlsSource, /Run test/)
  assert.match(controlsSource, /Check readiness/)
  assert.match(controlsSource, /Publish version/)
  assert.match(controlsSource, /Save notes/)
  assert.doesNotMatch(controlsSource, /Sign off version/)
})
