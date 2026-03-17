import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveAssessmentSessionState, getResumeQuestionIndex } from '../lib/assessment-session';

const questions = [
  { questionNumber: 1 },
  { questionNumber: 2 },
  { questionNumber: 3 },
  { questionNumber: 4 },
  { questionNumber: 5 },
];

test('deriveAssessmentSessionState returns deterministic answered/unanswered metadata', () => {
  const state = deriveAssessmentSessionState(
    questions,
    {
      1: 4,
      3: 2,
      5: 1,
    },
    4,
  );

  assert.equal(state.answeredCount, 3);
  assert.equal(state.unansweredCount, 2);
  assert.equal(state.isAssessmentComplete, false);
  assert.deepEqual(state.unansweredQuestionNumbers, [2, 4]);
  assert.deepEqual(state.unansweredIndices, [1, 3]);
  assert.equal(state.firstUnansweredIndex, 1);
  assert.equal(state.firstUnansweredQuestionNumber, 2);
});

test('navigator states include answered/unanswered/current markers', () => {
  const state = deriveAssessmentSessionState(
    questions,
    {
      1: 4,
      4: 2,
    },
    2,
  );

  assert.equal(state.navigatorItems[0]?.state, 'answered');
  assert.equal(state.navigatorItems[1]?.state, 'unanswered');
  assert.equal(state.navigatorItems[2]?.state, 'current');
  assert.equal(state.navigatorItems[3]?.state, 'answered');
});

test('resume behaviour remains next unanswered by default', () => {
  const resumeIndex = getResumeQuestionIndex(
    questions,
    {
      1: 5,
      2: 4,
      4: 3,
    },
  );

  assert.equal(resumeIndex, 2);
});

test('resume behaviour uses last question when all are answered', () => {
  const resumeIndex = getResumeQuestionIndex(
    questions,
    {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
    },
  );

  assert.equal(resumeIndex, 4);
});

test('completion guard condition can proceed only when all responses exist', () => {
  const incompleteState = deriveAssessmentSessionState(questions, { 1: 3, 2: 4 }, 1);
  const completeState = deriveAssessmentSessionState(
    questions,
    { 1: 3, 2: 4, 3: 2, 4: 5, 5: 1 },
    4,
  );

  assert.equal(incompleteState.isAssessmentComplete, false);
  assert.equal(completeState.isAssessmentComplete, true);
});
