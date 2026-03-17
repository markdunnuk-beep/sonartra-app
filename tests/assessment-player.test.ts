import assert from 'node:assert/strict';
import test from 'node:test';

import { isFinalQuestionIndex, shouldClearReviewModeOnAnswer } from '../lib/assessment-player';

test('isFinalQuestionIndex returns false before final question', () => {
  assert.equal(isFinalQuestionIndex(2, 5), false);
});

test('isFinalQuestionIndex returns true on final question', () => {
  assert.equal(isFinalQuestionIndex(4, 5), true);
});

test('isFinalQuestionIndex returns false when no questions are loaded', () => {
  assert.equal(isFinalQuestionIndex(0, 0), false);
});

test('shouldClearReviewModeOnAnswer clears review mode when answering a previously unanswered question', () => {
  assert.equal(
    shouldClearReviewModeOnAnswer({
      reviewMode: true,
      hadAnswer: false,
    }),
    true,
  );
});

test('shouldClearReviewModeOnAnswer keeps review mode when changing an already answered response', () => {
  assert.equal(
    shouldClearReviewModeOnAnswer({
      reviewMode: true,
      hadAnswer: true,
    }),
    false,
  );
});

test('shouldClearReviewModeOnAnswer stays false outside review mode', () => {
  assert.equal(
    shouldClearReviewModeOnAnswer({
      reviewMode: false,
      hadAnswer: false,
    }),
    false,
  );
});
