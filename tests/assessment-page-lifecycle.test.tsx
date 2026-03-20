import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TestRenderer, { act } from 'react-test-renderer'

import { AssessmentRepositoryPage } from '../components/assessment/AssessmentRepositoryPage'
import {
  buildAssessmentSections,
  buildAssessmentSummaryMetrics,
  createAssessmentCatalogueSnapshot,
  deriveAssessmentRepositoryItem,
  getAssessmentRepositoryInventory,
  getCollapsedAction,
  getExpandedActions,
  getVisibleAssessmentDefinitions,
  resolveRepositoryItemStatus,
  resolveRepositoryVisibilityState,
} from '../lib/assessment/assessment-repository-selectors'
import { getCurrentAssessmentRepositoryContext } from '../lib/assessment/assessment-repository-context'

const context = getCurrentAssessmentRepositoryContext()
const snapshot = createAssessmentCatalogueSnapshot()
const inventory = getAssessmentRepositoryInventory(context, snapshot)

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

test('summary strip counts use derived config-driven repository metrics', () => {
  const metrics = buildAssessmentSummaryMetrics(inventory)

  assert.deepEqual(metrics.map((metric) => [metric.label, metric.value]), [
    ['Total Assessments', '10'],
    ['In Progress', '1'],
    ['Completed', '1'],
    ['Team Assessments', '5'],
  ])
})

test('visible catalogue items exclude hidden and archived definitions before repository derivation', () => {
  const visibleDefinitions = getVisibleAssessmentDefinitions(context, snapshot)

  assert.equal(visibleDefinitions.length, 10)
  assert.ok(visibleDefinitions.every((definition) => definition.id !== 'shadow-hidden-role-fit'))
  assert.ok(visibleDefinitions.every((definition) => definition.id !== 'shadow-archived-team-health'))
})

test('visibility state explicitly distinguishes visible, hidden, disabled, and archived items', () => {
  assert.equal(
    resolveRepositoryVisibilityState(
      { isPublished: true, isVisibleInRepository: true, releaseState: 'live' },
      { isEnabled: true, isHidden: false },
    ),
    'visible',
  )

  assert.equal(
    resolveRepositoryVisibilityState(
      { isPublished: true, isVisibleInRepository: true, releaseState: 'live' },
      { isEnabled: true, isHidden: true },
    ),
    'hidden',
  )

  assert.equal(
    resolveRepositoryVisibilityState(
      { isPublished: false, isVisibleInRepository: true, releaseState: 'live' },
      { isEnabled: true, isHidden: false },
    ),
    'disabled',
  )

  assert.equal(
    resolveRepositoryVisibilityState(
      { isPublished: true, isVisibleInRepository: true, releaseState: 'archived' },
      { isEnabled: true, isHidden: false },
    ),
    'archived',
  )
})

test('derived status precedence keeps coming soon above progress and complete states', () => {
  assert.equal(resolveRepositoryItemStatus({ hasActiveAttempt: true, hasCompletedResult: true }, { releaseState: 'coming_soon' }), 'coming_soon')
  assert.equal(resolveRepositoryItemStatus({ hasActiveAttempt: true, hasCompletedResult: true }, { releaseState: 'live' }), 'in_progress')
  assert.equal(resolveRepositoryItemStatus({ hasActiveAttempt: false, hasCompletedResult: true }, { releaseState: 'live' }), 'complete')
  assert.equal(resolveRepositoryItemStatus(null, { releaseState: 'live' }), 'not_started')
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

  assert.equal(getCollapsedAction(notStarted!)?.label, 'Start')
  assert.equal(getCollapsedAction(inProgress!)?.label, 'Resume')
  assert.equal(getCollapsedAction(complete!)?.label, 'View Results')
  assert.equal(getExpandedActions(complete!).map((action) => action.label).join(' | '), 'View Results | Retake Assessment')
  assert.equal(getCollapsedAction(comingSoon!), null)
  assert.deepEqual(getExpandedActions(comingSoon!), [])
})

test('advanced outputs remain a secondary label while primary repository status stays not started', () => {
  const teamDynamics = inventory.find((item) => item.id === 'team-dynamics')

  assert.equal(teamDynamics?.status, 'not_started')
  assert.equal(teamDynamics?.hasAdvancedOutputs, true)
  assert.match(teamDynamics?.outputRows[1]?.label ?? '', /Advanced outputs/)
})

test('derived repository item exposes admin-ready catalogue and availability metadata without leaking it into UI status', () => {
  const definition = snapshot.definitions.find((item) => item.id === 'manager-effectiveness')
  const availability = snapshot.availability.find((item) => item.assessmentId === 'manager-effectiveness')
  const derived = deriveAssessmentRepositoryItem(definition!, availability!, null, context)

  assert.equal(derived.status, 'not_started')
  assert.equal(derived.releaseState, 'live')
  assert.equal(derived.visibilityState, 'visible')
  assert.equal(derived.availabilityScope, 'role')
  assert.equal(derived.advancedOutputsPlanRequirement, 'enterprise')
  assert.equal(derived.fullAccessPlanRequirement, 'growth')
})

test('ui still renders expected inventory from derived selectors', () => {
  assert.deepEqual(
    inventory.map((item) => [item.title, item.status, item.hasAdvancedOutputs]),
    [
      ['Sonartra Signals', 'complete', false],
      ['Leadership Effectiveness', 'not_started', false],
      ['Burnout Risk', 'in_progress', false],
      ['Conflict Style', 'not_started', false],
      ['Decision Profile', 'coming_soon', false],
      ['Team Dynamics', 'not_started', true],
      ['Team Alignment', 'not_started', false],
      ['Manager Effectiveness', 'not_started', true],
      ['Culture Risk', 'not_started', true],
      ['Decision Friction Mapping', 'coming_soon', false],
    ],
  )
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
