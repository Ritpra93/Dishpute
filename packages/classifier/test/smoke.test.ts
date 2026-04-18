import assert from 'node:assert/strict';
import { createMockClassifier } from '../src/index';
import { FIXTURE_DISPUTES, MERIT_THRESHOLDS } from '@counter/types';

async function run() {
  console.log('Running classifier smoke tests...\n');

  const classifier = createMockClassifier();
  const results = await classifier.classifyMany(FIXTURE_DISPUTES);

  // 1. Count
  assert.equal(results.length, 30, `Expected 30 classifications, got ${results.length}`);
  console.log(`✓ classifyMany returns ${results.length} results`);

  // 2. Every result has the right candidateId
  for (const r of results) {
    const match = FIXTURE_DISPUTES.find((d) => d.id === r.candidateId);
    assert.ok(match, `No fixture found for candidateId: ${r.candidateId}`);
  }
  console.log('✓ All candidateIds match FIXTURE_DISPUTES');

  // 3. Merit distribution
  const autoSubmit = results.filter((r) => r.shouldDispute && r.meritScore >= MERIT_THRESHOLDS.AUTO_SUBMIT);
  const humanReview = results.filter(
    (r) => r.shouldDispute && r.meritScore >= MERIT_THRESHOLDS.HUMAN_REVIEW && r.meritScore < MERIT_THRESHOLDS.AUTO_SUBMIT,
  );
  const skip = results.filter((r) => !r.shouldDispute);

  assert.ok(autoSubmit.length >= 22, `Expected ≥22 auto-submit, got ${autoSubmit.length}`);
  assert.ok(humanReview.length >= 4, `Expected ≥4 human-review, got ${humanReview.length}`);
  assert.ok(skip.length >= 4, `Expected ≥4 skip, got ${skip.length}`);
  console.log(`✓ Merit distribution: ${autoSubmit.length} auto-submit | ${humanReview.length} human-review | ${skip.length} skip`);

  // 4. Demo number: $892.00 recoverable from auto-submit tier
  const totalRecoverable = autoSubmit.reduce((sum, r) => sum + r.recoverableCents, 0);
  assert.equal(totalRecoverable, 89200, `Expected $892.00 recoverable, got $${(totalRecoverable / 100).toFixed(2)}`);
  console.log(`✓ Total recoverable from auto-submit tier: $${(totalRecoverable / 100).toFixed(2)}`);

  // 5. Skip tier has zero recoverableCents
  for (const r of skip) {
    assert.equal(r.recoverableCents, 0, `Skip entry ${r.candidateId} should have recoverableCents=0, got ${r.recoverableCents}`);
  }
  console.log('✓ All skip-tier entries have recoverableCents = 0');

  // 6. Every result has required fields and valid shapes
  for (const r of results) {
    assert.ok(typeof r.meritScore === 'number' && r.meritScore >= 0 && r.meritScore <= 100, `Invalid meritScore for ${r.candidateId}`);
    assert.ok(r.draftedDisputeText.length >= 50, `draftedDisputeText too short for ${r.candidateId}`);
    assert.ok(r.evidenceCitations.length >= 1, `evidenceCitations empty for ${r.candidateId}`);
    assert.ok(r.generatedAt, `Missing generatedAt for ${r.candidateId}`);
  }
  console.log('✓ All results have valid field shapes');

  // 7. Single classify works too
  const single = await classifier.classify(FIXTURE_DISPUTES[0]);
  assert.equal(single.candidateId, 'dc-001');
  assert.equal(single.recoverableCents, 5200);
  console.log('✓ classify() works for single candidate');

  console.log('\nAll smoke tests passed.');
}

run().catch((err) => {
  console.error('\nSmoke test FAILED:', err.message);
  process.exit(1);
});
