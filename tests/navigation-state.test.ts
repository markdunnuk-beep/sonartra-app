import assert from 'node:assert/strict'
import test from 'node:test'

import { getNavigationLifecycleState } from '../lib/server/navigation-state'

test('navigation unlock logic matches canonical ready state', async () => {
  const ready = await getNavigationLifecycleState('user-1', async () => ({
    authState: 'authenticated',
    userId: 'user-1',
    lifecycle: {
      state: 'ready',
      latestAssessment: null,
      latestAssessmentResult: null,
      latestReadyResult: null,
      message: 'ready',
    },
  }))

  const pending = await getNavigationLifecycleState('user-1', async () => ({
    authState: 'authenticated',
    userId: 'user-1',
    lifecycle: {
      state: 'completed_processing',
      latestAssessment: null,
      latestAssessmentResult: null,
      latestReadyResult: null,
      message: 'pending',
    },
  }))

  assert.equal(ready.hasCompletedAssessment, true)
  assert.equal(pending.hasCompletedAssessment, false)
})
