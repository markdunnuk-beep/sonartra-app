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
  getActionState,
  getAssessmentFilterGroups,
  getAssessmentRepositoryInventory,
  getCollapsedAction,
  getExpandedActions,
  getPassiveState,
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

test('assessment repository renders operational summary metrics, grouped filters, and both assessment sections', () => {
  const html = renderRepository()

  assert.match(html, /Ready to Start/)
  assert.match(html, /In Progress/)
  assert.match(html, /Results Ready/)
  assert.match(html, /Release Pending/)
  assert.match(html, /Repository scope/)
  assert.match(html, /Progress state/)
  assert.match(html, /Any status/)
  assert.match(html, /Individual Assessments/)
  assert.match(html, /Team Assessments/)
  assert.match(html, /Eligible team diagnostics include advanced organizational reporting on supported plans\./)
  assert.match(html, /Sonartra Signals/)
  assert.match(html, /Team Dynamics/)
  assert.doesNotMatch(html, /Advanced outputs<\/span>/)
})

test('summary strip counts stay within one operational state model', () => {
  const metrics = buildAssessmentSummaryMetrics(inventory)

  assert.deepEqual(metrics.map((metric) => [metric.label, metric.value]), [
    ['Ready to Start', '6'],
    ['In Progress', '1'],
    ['Results Ready', '1'],
    ['Release Pending', '2'],
  ])
})

test('filter groups separate repository scope from progress state semantics with independent controls', () => {
  const [scopeGroup, progressGroup] = getAssessmentFilterGroups()

  assert.equal(scopeGroup.key, 'scope')
  assert.equal(progressGroup.key, 'progress')
  assert.deepEqual(scopeGroup.options.map((option) => option.value), ['all', 'individual', 'team'])
  assert.deepEqual(progressGroup.options.map((option) => option.value), ['all', 'in_progress', 'completed'])
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
  const sections = buildAssessmentSections(inventory, { scope: 'all', progress: 'all' })
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

test('filters refine within section structure and support combining scope with progress state', () => {
  const completedSections = buildAssessmentSections(inventory, { scope: 'all', progress: 'completed' })
  const teamSections = buildAssessmentSections(inventory, { scope: 'team', progress: 'all' })
  const teamCompletedSections = buildAssessmentSections(inventory, { scope: 'team', progress: 'completed' })

  assert.equal(completedSections.length, 1)
  assert.equal(completedSections[0]?.title, 'Individual Assessments')
  assert.deepEqual(completedSections[0]?.items.map((item) => item.title), ['Sonartra Signals'])

  assert.equal(teamSections.length, 1)
  assert.equal(teamSections[0]?.title, 'Team Assessments')
  assert.ok(teamSections[0]?.items.every((item) => item.category === 'team'))

  assert.deepEqual(teamCompletedSections, [])
})

test('status and CTA mapping keep actions distinct from passive repository states', () => {
  const notStarted = inventory.find((item) => item.id === 'leadership-effectiveness')
  const inProgress = inventory.find((item) => item.id === 'burnout-risk')
  const complete = inventory.find((item) => item.id === 'signals')
  const comingSoon = inventory.find((item) => item.id === 'decision-profile')

  assert.equal(getCollapsedAction(notStarted!)?.label, 'Start')
  assert.equal(getActionState(notStarted!)?.label, 'Launch now')
  assert.equal(getCollapsedAction(inProgress!)?.label, 'Resume')
  assert.equal(getActionState(inProgress!)?.detail, 'Continue from the latest autosaved response set.')
  assert.equal(getCollapsedAction(complete!)?.label, 'View Results')
  assert.equal(getExpandedActions(complete!).map((action) => action.label).join(' | '), 'View Results | Retake Assessment')
  assert.equal(getCollapsedAction(comingSoon!), null)
  assert.deepEqual(getExpandedActions(comingSoon!), [])
  assert.deepEqual(getPassiveState(comingSoon!), {
    label: 'Release pending',
    detail: 'Visible for planning only until release readiness is confirmed.',
  })
})

test('team advanced reporting shifts to calmer section and output semantics without repeated badge clutter', () => {
  const teamDynamics = inventory.find((item) => item.id === 'team-dynamics')

  assert.equal(teamDynamics?.status, 'not_started')
  assert.equal(teamDynamics?.hasAdvancedOutputs, true)
  assert.match(teamDynamics?.outputRows[1]?.label ?? '', /Reporting scope/)
  assert.doesNotMatch(teamDynamics?.outputRows[1]?.label ?? '', /Advanced outputs/)
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

test('repository inventory preserves the canonical direct-launch workspace route for Sonartra Signals', () => {
  const signals = inventory.find((item) => item.id === 'signals')

  assert.equal(signals?.assessmentHref, '/assessment/workspace')
  assert.equal(getCollapsedAction(signals!)?.href, '/results/individual')
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
  assert.match(JSON.stringify(renderer.toJSON()), /Resume now/)
  assert.match(JSON.stringify(renderer.toJSON()), /Continue from the latest autosaved response set/)

  act(() => {
    findCard('decision-profile').props.onClick()
  })

  const comingSoonExpanded = JSON.stringify(renderer.toJSON())
  assert.match(comingSoonExpanded, /Release pending/)
  assert.match(comingSoonExpanded, /Visible for planning only until release readiness is confirmed/)

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
