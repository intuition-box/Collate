import test from 'node:test';
import assert from 'node:assert/strict';

import { getCsvWorkflowStage } from '@/lib/utils/csv-workflow-state';

test('CSV workflow advances from preparation to preview and review', () => {
  assert.equal(getCsvWorkflowStage({ hasPreview: false, isReviewing: false, hasReview: false }), 'prepare');
  assert.equal(getCsvWorkflowStage({ hasPreview: true, isReviewing: false, hasReview: false }), 'preview');
  assert.equal(getCsvWorkflowStage({ hasPreview: true, isReviewing: true, hasReview: false }), 'review');
  assert.equal(getCsvWorkflowStage({ hasPreview: true, isReviewing: false, hasReview: false, reviewStarted: true }), 'review');
});

test('CSV workflow returns to review after an error and advances to publish only after review', () => {
  assert.equal(getCsvWorkflowStage({ hasPreview: true, isReviewing: false, hasReview: false, reviewFailed: true }), 'review');
  assert.equal(getCsvWorkflowStage({ hasPreview: true, isReviewing: false, hasReview: true }), 'publish');
  assert.equal(getCsvWorkflowStage({ hasPreview: true, isReviewing: false, hasReview: true, reviewStarted: true }), 'publish');
  assert.equal(getCsvWorkflowStage({ hasPreview: true, isReviewing: false, hasReview: false }), 'preview');
  assert.equal(getCsvWorkflowStage({ hasPreview: false, isReviewing: false, hasReview: false, reviewStarted: true }), 'prepare');
});
