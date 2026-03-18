import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildArchetypeResolverInput,
  isBalancedBehaviourProfile,
  resolveArchetypeFromInput,
  resolveArchetypeSummary,
  resolveBehaviourRanking,
  type ArchetypeResolverInput,
} from '../lib/interpretation/archetypes'
import type { IndividualResultSignalSummary } from '../lib/server/individual-results'

function makeInput(overrides: Partial<ArchetypeResolverInput> = {}): ArchetypeResolverInput {
  return {
    behaviour: {
      driver: 40,
      analyst: 30,
      explorer: 20,
      stabiliser: 10,
    },
    motivators: {
      achievement: 40,
      autonomy: 30,
      mastery: 20,
      affiliation: 10,
    },
    leadership: {
      directive: 35,
      strategic: 30,
      coaching: 20,
      supportive: 15,
    },
    conflict: {
      competing: 35,
      collaborating: 30,
      compromising: 15,
      avoiding: 10,
      accommodating: 10,
    },
    culture: {
      performance: 40,
      innovation: 30,
      control: 20,
      collaboration: 10,
    },
    stress: {
      intensify: 35,
      control: 30,
      withdraw: 20,
      adapt: 15,
    },
    ...overrides,
  }
}

function makeSignals(): IndividualResultSignalSummary[] {
  return [
    { layerKey: 'behaviour_style', signalKey: 'Core_Driver', signalTotal: 40, normalisedScore: 0.4, relativeShare: 0.4, rank: 1, isPrimary: true, isSecondary: false },
    { layerKey: 'behaviour_style', signalKey: 'Core_Analyst', signalTotal: 30, normalisedScore: 0.3, relativeShare: 0.3, rank: 2, isPrimary: false, isSecondary: true },
    { layerKey: 'behaviour_style', signalKey: 'Core_Influencer', signalTotal: 20, normalisedScore: 0.2, relativeShare: 0.2, rank: 3, isPrimary: false, isSecondary: false },
    { layerKey: 'behaviour_style', signalKey: 'Core_Stabiliser', signalTotal: 10, normalisedScore: 0.1, relativeShare: 0.1, rank: 4, isPrimary: false, isSecondary: false },
    { layerKey: 'motivators', signalKey: 'Mot_Achievement', signalTotal: 40, normalisedScore: 0.4, relativeShare: 0.4, rank: 1, isPrimary: true, isSecondary: false },
    { layerKey: 'motivators', signalKey: 'Need_Authority', signalTotal: 30, normalisedScore: 0.3, relativeShare: 0.3, rank: 2, isPrimary: false, isSecondary: true },
    { layerKey: 'motivators', signalKey: 'Mot_Mastery', signalTotal: 20, normalisedScore: 0.2, relativeShare: 0.2, rank: 3, isPrimary: false, isSecondary: false },
    { layerKey: 'motivators', signalKey: 'Need_Belonging', signalTotal: 10, normalisedScore: 0.1, relativeShare: 0.1, rank: 4, isPrimary: false, isSecondary: false },
    { layerKey: 'leadership', signalKey: 'Leader_Results', signalTotal: 35, normalisedScore: 0.35, relativeShare: 0.35, rank: 1, isPrimary: true, isSecondary: false },
    { layerKey: 'leadership', signalKey: 'Leader_Vision', signalTotal: 30, normalisedScore: 0.3, relativeShare: 0.3, rank: 2, isPrimary: false, isSecondary: true },
    { layerKey: 'leadership', signalKey: 'Leader_People', signalTotal: 20, normalisedScore: 0.2, relativeShare: 0.2, rank: 3, isPrimary: false, isSecondary: false },
    { layerKey: 'leadership', signalKey: 'Leader_Process', signalTotal: 15, normalisedScore: 0.15, relativeShare: 0.15, rank: 4, isPrimary: false, isSecondary: false },
    { layerKey: 'conflict', signalKey: 'Conflict_Compete', signalTotal: 35, normalisedScore: 0.35, relativeShare: 0.35, rank: 1, isPrimary: true, isSecondary: false },
    { layerKey: 'conflict', signalKey: 'Conflict_Collaborate', signalTotal: 30, normalisedScore: 0.3, relativeShare: 0.3, rank: 2, isPrimary: false, isSecondary: true },
    { layerKey: 'conflict', signalKey: 'Conflict_Compromise', signalTotal: 15, normalisedScore: 0.15, relativeShare: 0.15, rank: 3, isPrimary: false, isSecondary: false },
    { layerKey: 'conflict', signalKey: 'Conflict_Avoid', signalTotal: 10, normalisedScore: 0.1, relativeShare: 0.1, rank: 4, isPrimary: false, isSecondary: false },
    { layerKey: 'conflict', signalKey: 'Conflict_Accommodate', signalTotal: 10, normalisedScore: 0.1, relativeShare: 0.1, rank: 5, isPrimary: false, isSecondary: false },
    { layerKey: 'culture', signalKey: 'Culture_Market', signalTotal: 40, normalisedScore: 0.4, relativeShare: 0.4, rank: 1, isPrimary: true, isSecondary: false },
    { layerKey: 'culture', signalKey: 'Culture_Adhocracy', signalTotal: 30, normalisedScore: 0.3, relativeShare: 0.3, rank: 2, isPrimary: false, isSecondary: true },
    { layerKey: 'culture', signalKey: 'Culture_Hierarchy', signalTotal: 20, normalisedScore: 0.2, relativeShare: 0.2, rank: 3, isPrimary: false, isSecondary: false },
    { layerKey: 'culture', signalKey: 'Culture_Clan', signalTotal: 10, normalisedScore: 0.1, relativeShare: 0.1, rank: 4, isPrimary: false, isSecondary: false },
    { layerKey: 'risk', signalKey: 'Stress_Criticality', signalTotal: 35, normalisedScore: 0.35, relativeShare: 0.35, rank: 1, isPrimary: true, isSecondary: false },
    { layerKey: 'risk', signalKey: 'Stress_Control', signalTotal: 30, normalisedScore: 0.3, relativeShare: 0.3, rank: 2, isPrimary: false, isSecondary: true },
    { layerKey: 'risk', signalKey: 'Stress_Avoidance', signalTotal: 20, normalisedScore: 0.2, relativeShare: 0.2, rank: 3, isPrimary: false, isSecondary: false },
    { layerKey: 'risk', signalKey: 'Decision_Stability', signalTotal: 15, normalisedScore: 0.15, relativeShare: 0.15, rank: 4, isPrimary: false, isSecondary: false },
  ]
}

test('resolveBehaviourRanking sorts descending and calculates gaps deterministically', () => {
  const ranking = resolveBehaviourRanking({ driver: 31, analyst: 31, explorer: 24, stabiliser: 14 })

  assert.deepEqual(ranking.ranked.map((entry) => entry.key), ['driver', 'analyst', 'explorer', 'stabiliser'])
  assert.equal(ranking.topToSecondGap, 0)
  assert.equal(ranking.topToThirdGap, 7)
})

test('balanced override detects even behaviour profiles', () => {
  const ranking = resolveBehaviourRanking({ driver: 27, analyst: 25, explorer: 23, stabiliser: 25 })

  assert.equal(isBalancedBehaviourProfile(ranking), true)

  const summary = resolveArchetypeFromInput(makeInput({ behaviour: { driver: 27, analyst: 25, explorer: 23, stabiliser: 25 } }))
  assert.equal(summary.primaryKey, 'balanced_operator')
  assert.equal(summary.confidence, 'balanced')
  assert.equal(summary.secondaryKey, undefined)
})

test('mapping routes resolve each primary archetype deterministically', () => {
  const cases: Array<{ behaviour: ArchetypeResolverInput['behaviour']; expected: string }> = [
    { behaviour: { driver: 40, analyst: 30, explorer: 20, stabiliser: 10 }, expected: 'strategic_operator' },
    { behaviour: { driver: 40, analyst: 15, explorer: 30, stabiliser: 15 }, expected: 'growth_catalyst' },
    { behaviour: { driver: 38, analyst: 16, explorer: 10, stabiliser: 36 }, expected: 'execution_anchor' },
    { behaviour: { driver: 10, analyst: 42, explorer: 16, stabiliser: 32 }, expected: 'systems_architect' },
    { behaviour: { driver: 12, analyst: 41, explorer: 33, stabiliser: 14 }, expected: 'insight_explorer' },
    { behaviour: { driver: 33, analyst: 14, explorer: 41, stabiliser: 12 }, expected: 'momentum_builder' },
    { behaviour: { driver: 14, analyst: 33, explorer: 41, stabiliser: 12 }, expected: 'adaptive_pioneer' },
    { behaviour: { driver: 16, analyst: 32, explorer: 10, stabiliser: 42 }, expected: 'trusted_integrator' },
    { behaviour: { driver: 12, analyst: 14, explorer: 32, stabiliser: 42 }, expected: 'culture_anchor' },
  ]

  for (const { behaviour, expected } of cases) {
    const summary = resolveArchetypeFromInput(
      makeInput({
        behaviour,
        leadership: { directive: 10, strategic: 15, coaching: 40, supportive: 35 },
        conflict: { competing: 10, collaborating: 38, compromising: 20, avoiding: 12, accommodating: 20 },
        culture: { performance: 10, innovation: 20, control: 15, collaboration: 55 },
        motivators: { achievement: 10, autonomy: 20, mastery: 15, affiliation: 55 },
      }),
    )

    assert.equal(summary.primaryKey, expected)
  }
})

test('secondary influence is shown only when thresholds are met and never duplicates the primary', () => {
  const shown = resolveArchetypeFromInput(makeInput({ behaviour: { driver: 33, analyst: 28, explorer: 25, stabiliser: 14 } }))
  assert.ok(shown.secondaryKey)
  assert.notEqual(shown.secondaryKey, shown.primaryKey)

  const omittedByGap = resolveArchetypeFromInput(makeInput({ behaviour: { driver: 42, analyst: 20, explorer: 24, stabiliser: 14 } }))
  assert.equal(omittedByGap.secondaryKey, undefined)

  const omittedByShare = resolveArchetypeFromInput(makeInput({ behaviour: { driver: 31, analyst: 21, explorer: 21, stabiliser: 20 } }))
  assert.equal(omittedByShare.secondaryKey, undefined)
})

test('confidence resolves as balanced, high, or medium using explicit gap rules', () => {
  assert.equal(resolveArchetypeFromInput(makeInput({ behaviour: { driver: 27, analyst: 25, explorer: 24, stabiliser: 24 } })).confidence, 'balanced')
  assert.equal(resolveArchetypeFromInput(makeInput({ behaviour: { driver: 44, analyst: 26, explorer: 18, stabiliser: 12 } })).confidence, 'high')
  assert.equal(resolveArchetypeFromInput(makeInput({ behaviour: { driver: 36, analyst: 30, explorer: 19, stabiliser: 15 } })).confidence, 'medium')
})

test('summary payload returns the required shape and omits secondary fields when not needed', () => {
  const summary = resolveArchetypeFromInput(makeInput({ behaviour: { driver: 44, analyst: 26, explorer: 18, stabiliser: 12 } }))

  assert.equal(typeof summary.primaryKey, 'string')
  assert.equal(typeof summary.primaryLabel, 'string')
  assert.equal(typeof summary.confidence, 'string')
  assert.equal(typeof summary.behaviouralTilt, 'string')
  assert.equal(typeof summary.summary, 'string')
  assert.equal(summary.strengths.length, 3)
  assert.ok(summary.watchouts.length >= 2)
  assert.ok(summary.focusAreas.length >= 2)
  assert.equal(summary.secondaryKey, undefined)
  assert.equal(summary.secondaryLabel, undefined)
})

test('signal normalisation produces stable canonical section percentages and full summary output', () => {
  const resolverInput = buildArchetypeResolverInput(makeSignals())
  assert.deepEqual(resolverInput.behaviour, { driver: 40, analyst: 30, explorer: 20, stabiliser: 10 })
  assert.deepEqual(resolverInput.culture, { performance: 40, innovation: 30, control: 20, collaboration: 10 })

  const summary = resolveArchetypeSummary(makeSignals())
  assert.equal(summary.primaryKey, 'strategic_operator')
  assert.match(summary.summary, /achievement/i)
})
