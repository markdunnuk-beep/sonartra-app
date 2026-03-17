import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveAssessmentEntryPhase } from '../lib/assessment-entry-state';

test('initial state is ready to start when no failure exists', () => {
  const phase = deriveAssessmentEntryPhase('intro', null);
  assert.equal(phase, 'ready');
});

test('starting state is reported while start/resume request is in-flight', () => {
  const phase = deriveAssessmentEntryPhase('starting', null);
  assert.equal(phase, 'starting');
});

test('active state is reported when assessment session has been loaded', () => {
  const phase = deriveAssessmentEntryPhase('active', null);
  assert.equal(phase, 'active');
});

test('failure state is shown only after an actual start/resume error', () => {
  const phase = deriveAssessmentEntryPhase('intro', 'Unable to start assessment.');
  assert.equal(phase, 'failed');
});
