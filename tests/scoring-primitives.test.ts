import assert from 'node:assert/strict';
import test from 'node:test';

import { aggregateSignalTotals, scoreLayerSignals } from '../lib/scoring/calculators';
import { scoreAssessment } from '../lib/scoring/engine';
import { calculateNormalisedScore, calculateRelativeShare } from '../lib/scoring/normalisers';
import { buildResultSnapshotPayload } from '../lib/scoring/snapshot';
import { ScoringEngineInput } from '../lib/scoring/types';
import { createAssessmentResultSnapshot } from '../lib/server/assessment-results';

const baseInput: ScoringEngineInput = {
  assessmentId: 'assessment-1',
  assessmentVersionId: 'version-1',
  versionKey: 'wplp80-v1',
  scoringModelKey: 'wplp80-signal-model-v1',
  snapshotVersion: 1,
  startedAt: '2026-01-01T10:00:00.000Z',
  completedAt: '2026-01-01T10:05:00.000Z',
  responses: [
    { questionId: 1, responseValue: 4, responseTimeMs: 1800 },
    { questionId: 2, responseValue: 2, responseTimeMs: 2200 },
  ],
  mappings: [
    { questionId: 1, responseValue: 4, signalCode: 'Core_Driver', signalWeight: 4, layerKey: 'behaviour_style' },
    { questionId: 2, responseValue: 2, signalCode: 'Core_Driver', signalWeight: 2, layerKey: 'behaviour_style' },
    { questionId: 1, responseValue: 4, signalCode: 'Core_Analyst', signalWeight: 1, layerKey: 'behaviour_style' },
  ],
};

test('aggregateSignalTotals groups by layer/signal with independent maxPossible', () => {
  const totals = aggregateSignalTotals(baseInput.mappings);
  const driver = totals.find((item) => item.signalKey === 'Core_Driver');
  const analyst = totals.find((item) => item.signalKey === 'Core_Analyst');

  assert.ok(driver);
  assert.equal(driver.rawTotal, 6);
  assert.equal(driver.maxPossible, 8);

  assert.ok(analyst);
  assert.equal(analyst.rawTotal, 1);
  assert.equal(analyst.maxPossible, 4);
});

test('normalised score is distinct from relative share', () => {
  assert.equal(calculateNormalisedScore(2, 4), 0.5);
  assert.equal(calculateRelativeShare(2, 10), 0.2);
});

test('scoreLayerSignals ranks deterministically and marks primary/secondary', () => {
  const totals = aggregateSignalTotals(baseInput.mappings);
  const layer = scoreLayerSignals('behaviour_style', totals);

  assert.equal(layer.signals[0]?.signalKey, 'Core_Driver');
  assert.equal(layer.signals[0]?.isPrimary, true);
  assert.equal(layer.signals[1]?.signalKey, 'Core_Analyst');
  assert.equal(layer.signals[1]?.isSecondary, true);
});

test('buildResultSnapshotPayload returns stable shape with response quality', () => {
  const scored = scoreAssessment(baseInput);
  const payload = buildResultSnapshotPayload({
    input: baseInput,
    layers: scored.snapshot.layers,
    responseQuality: scored.responseQuality,
  });

  assert.equal(payload.assessmentId, 'assessment-1');
  assert.equal(payload.layers.length >= 1, true);
  assert.equal(payload.responseQuality.completionDurationSeconds, 300);
});

test('response quality metadata includes completion duration and timing summary', () => {
  const scored = scoreAssessment(baseInput);

  assert.equal(scored.responseQuality.completionDurationSeconds, 300);
  assert.equal(scored.responseQuality.responseQualityStatus, 'normal');
  assert.equal(scored.responseQuality.timingSummary.timedResponseCount, 2);
});


test('persistence helper inserts parent and signal payload rows', async () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = [];
  const mockClient = {
    query: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });

      if (sql.includes('RETURNING id')) {
        return { rows: [{ id: 'result-1' }] };
      }

      return { rows: [] };
    },
  };

  const scored = scoreAssessment(baseInput);

  const result = await createAssessmentResultSnapshot(
    {
      assessmentId: baseInput.assessmentId,
      assessmentVersionId: baseInput.assessmentVersionId,
      versionKey: baseInput.versionKey,
      scoringModelKey: baseInput.scoringModelKey,
      snapshotVersion: baseInput.snapshotVersion,
      status: 'complete',
      resultPayload: scored.snapshot,
      responseQualityPayload: scored.responseQuality,
      completedAt: baseInput.completedAt,
      scoredAt: scored.snapshot.scoredAt,
      signalRows: scored.signals,
    },
    mockClient as never
  );

  assert.equal(result.assessmentResultId, 'result-1');
  assert.equal(calls.length, 2);
});
