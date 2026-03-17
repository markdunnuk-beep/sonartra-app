import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { DashboardPreResultContent } from '../components/dashboard/DashboardPageView'
import { DashboardState } from '../lib/server/dashboard-state'

function makeState(status: DashboardState['assessment']['status']): DashboardState {
  return {
    authStatus: 'authenticated',
    hasCompletedResult: false,
    result: null,
    assessment: {
      status,
      progressPercent: status === 'not_started' ? 0 : 100,
      questionsCompleted: status === 'not_started' ? 0 : 80,
      questionsRemaining: status === 'not_started' ? 80 : 0,
    },
  }
}

test('lower card renders not_started title, body, and CTA', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeState('not_started')} />)

  assert.match(html, /Assessment not started/)
  assert.match(html, /Complete the assessment to unlock Individual Results\./)
  assert.match(html, />Start assessment</)
})

test('lower card renders in_progress title, body, and CTA', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeState('in_progress')} />)

  assert.match(html, /Assessment in progress/)
  assert.match(html, /Continue the assessment to complete your profile\./)
  assert.match(html, />Resume assessment</)
})

test('lower card renders completed_processing title and body and does not render in-progress CTA', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeState('completed_processing')} />)

  assert.match(html, /Assessment completed/)
  assert.match(html, /Your responses have been recorded\. Results are not available yet\./)
  assert.doesNotMatch(html, />Resume assessment</)
  assert.doesNotMatch(html, /Assessment in progress/)
})

test('lower card renders ready title, body, and results CTA', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeState('ready')} />)

  assert.match(html, /Results available/)
  assert.match(html, /Your latest completed profile is ready to view\./)
  assert.match(html, />View Individual Results</)
})

test('lower card renders error title, body, and safe CTA', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeState('error')} />)

  assert.match(html, /Results unavailable/)
  assert.match(html, /The assessment completed, but results could not be loaded\./)
  assert.match(html, />Return to dashboard</)
})

test('lower card detail state remains aligned with top-level lifecycle status card', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeState('completed_processing')} />)

  assert.match(html, /Completed — results pending/)
  assert.match(html, /Assessment completed/)
})
