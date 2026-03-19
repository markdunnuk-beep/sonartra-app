import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TestRenderer, { act } from 'react-test-renderer'

import { AssessmentRepositoryPage } from '../components/assessment/AssessmentRepositoryPage'
import {
  buildAssessmentSections,
  buildAssessmentSummaryMetrics,
  getAssessmentRepositoryInventory,
  getCollapsedAction,
  getExpandedActions,
} from '../lib/assessment/assessment-repository-selectors'

const inventory = getAssessmentRepositoryInventory()

Object.assign(globalThis, { self: globalThis })

function renderRepository() {
  return renderToStaticMarkup(<AssessmentRepositoryPage inventory={inventory} />)
}

test('assessment repository renders the approved header content, summary metrics, and both assessment sections', () => {
  const html = renderRepository()

  assert.match(html, /Total Assessments/)
  assert.match(html, /In Progress/)
  assert.match(html, /Completed/)
  assert.match(html, /Team Assessments/)
  assert.match(html, /Individual Assessments/)
  assert.match(html, /Team Assessments/)
  assert.match(html, /Sonartra Signals/)
  assert.match(html, /Team Dynamics/)
  assert.doesNotMatch(html, /Available/)
})

test('summary strip counts use the locked repository metrics', () => {
  const metrics = buildAssessmentSummaryMetrics(inventory)

  assert.deepEqual(metrics.map((metric) => [metric.label, metric.value]), [
    ['Total Assessments', '10'],
    ['In Progress', '1'],
    ['Completed', '1'],
    ['Team Assessments', '5'],
  ])
})

test('section sorting follows the locked status precedence and preserves product order within a status', () => {
  const sections = buildAssessmentSections(inventory, 'all')
  const individualTitles = sections.find((section) => section.category === 'individual')?.items.map((item) => item.title)
  const teamTitles = sections.find((section) => section.category === 'team')?.items.map((item) => item.title)

  assert.deepEqual(individualTitles, [
    'Burnout Risk',
    'Leadership Effectiveness',
    'Conflict Style',
    'Sonartra Signals',
    'Decision Profile',
  ])

  assert.deepEqual(teamTitles, [
    'Team Dynamics',
    'Team Alignment',
    'Manager Effectiveness',
    'Culture Risk',
    'Decision Friction Mapping',
  ])
})

test('filters refine within section structure and hide sections with zero matching results', () => {
  const completedSections = buildAssessmentSections(inventory, 'completed')
  const teamSections = buildAssessmentSections(inventory, 'team')

  assert.equal(completedSections.length, 1)
  assert.equal(completedSections[0]?.title, 'Individual Assessments')
  assert.deepEqual(completedSections[0]?.items.map((item) => item.title), ['Sonartra Signals'])

  assert.equal(teamSections.length, 1)
  assert.equal(teamSections[0]?.title, 'Team Assessments')
  assert.ok(teamSections[0]?.items.every((item) => item.category === 'team'))
})

test('status and CTA mapping follow the approved repository rules including coming soon and retake states', () => {
  const notStarted = inventory.find((item) => item.id === 'leadership-effectiveness')
  const inProgress = inventory.find((item) => item.id === 'burnout-risk')
  const complete = inventory.find((item) => item.id === 'signals')
  const comingSoon = inventory.find((item) => item.id === 'decision-profile')

  assert.equal(getCollapsedAction(notStarted!).label, 'Start')
  assert.equal(getCollapsedAction(inProgress!).label, 'Resume')
  assert.equal(getCollapsedAction(complete!).label, 'View Results')
  assert.equal(getExpandedActions(complete!).map((action) => action.label).join(' | '), 'View Results | Retake Assessment')
  assert.equal(getCollapsedAction(comingSoon!), null)
  assert.deepEqual(getExpandedActions(comingSoon!), [])
})

test('only one card stays expanded per section and completed retakes open the snapshot confirmation modal', () => {
  const renderer = TestRenderer.create(<AssessmentRepositoryPage inventory={inventory} />)
  const findCard = (cardId: string) => renderer.root.find((node) => node.props['data-card-id'] === cardId)

  assert.doesNotMatch(JSON.stringify(renderer.toJSON()), /Identify pressure accumulation patterns affecting resilience/)

  act(() => {
    findCard('burnout-risk').props.onClick()
  })

  assert.match(JSON.stringify(renderer.toJSON()), /Identify pressure accumulation patterns affecting resilience/)

  act(() => {
    findCard('conflict-style').props.onClick()
  })

  const afterConflictExpand = JSON.stringify(renderer.toJSON())
  assert.doesNotMatch(afterConflictExpand, /Identify pressure accumulation patterns affecting resilience/)
  assert.match(afterConflictExpand, /Surface the response patterns most likely to show up when decisions stall/)

  act(() => {
    findCard('signals').props.onClick()
  })

  const retakeButton = renderer.root.find(
    (node) => node.type === 'button' && node.props.children === 'Retake Assessment',
  )

  act(() => {
    retakeButton.props.onClick()
  })

  assert.match(JSON.stringify(renderer.toJSON()), /Retake assessment\?/)
  assert.match(JSON.stringify(renderer.toJSON()), /new results snapshot/)
})
