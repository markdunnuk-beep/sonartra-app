import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { IndividualResultsWireframeContent } from '../components/results/IndividualResultsWireframe'

test('individual results wireframe renders the stacked assessment model and required section order', () => {
  const html = renderToStaticMarkup(<IndividualResultsWireframeContent />)

  assert.match(html, /Sonartra Signals — Individual Results/)
  assert.match(html, /Prompt 1 wireframe/)
  assert.match(html, /Latest assessment/)
  assert.match(html, /Archived snapshot/)
  assert.match(html, /Analyst–Driver profile with high structure, autonomy, and outcome focus\./)

  const sectionOrder = [
    'How to Use This Report',
    'Sonartra Archetype Overview',
    'Behaviour Style',
    'Motivators',
    'Leadership',
    'Conflict',
    'Culture',
    'Stress',
    'Performance Implications',
  ]

  let lastIndex = -1
  for (const label of sectionOrder) {
    const index = html.indexOf(label, lastIndex + 1)
    assert.notEqual(index, -1, `missing section: ${label}`)
    assert.ok(index > lastIndex, `${label} should appear after the previous section`)
    lastIndex = index
  }
})

test('individual results wireframe includes practical guidance and repeated domain scaffolding', () => {
  const html = renderToStaticMarkup(<IndividualResultsWireframeContent />)

  assert.match(html, /Mark tends to operate as an Analyst–Driver/)
  assert.match(html, /Primary profile: Analyst–Driver/)
  assert.match(html, /Primary profile: Mastery and autonomy/)
  assert.match(html, /Distribution \+ guidance/)
  assert.match(html, /Where Mark performs best/)
  assert.match(html, /Where performance risk appears/)
  assert.match(html, /Recommended focus/)
})
