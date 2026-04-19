/**
 * Live integration test — hits the real Anthropic API.
 * Run manually: ANTHROPIC_API_KEY=sk-ant-... tsx test/live.test.ts
 *
 * Uses disp_0004: $56.80 order, "half my order missing — biryani and paneer",
 * 3 items on one ticket. This is a strong-merit dispute in our fixture set.
 * Tests the full Haiku → Sonnet path. Costs ~$0.005 per run.
 * NOT part of pnpm test (no API key in CI).
 */
import assert from 'node:assert/strict';
import { createClassifier } from '../src/index';
import { FIXTURE_DISPUTES } from '@counter/types';

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.log('Skipping live test: ANTHROPIC_API_KEY not set.');
    process.exit(0);
  }

  const candidate = FIXTURE_DISPUTES.find((d) => d.id === 'disp_0004');
  assert.ok(candidate, 'disp_0004 not found in FIXTURE_DISPUTES');

  console.log(`\nLive test — candidate: ${candidate.id}`);
  console.log(`  Order:   ${candidate.orderId}`);
  console.log(`  Charge:  $${(candidate.chargeAmountCents / 100).toFixed(2)}`);
  console.log(`  Comment: "${candidate.customerComment}"\n`);

  const classifier = createClassifier({ anthropicApiKey: apiKey });
  const startMs = Date.now();
  const result = await classifier.classify(candidate);
  const elapsedMs = Date.now() - startMs;

  console.log(`Completed in ${elapsedMs}ms\n`);

  // ── assertions ──────────────────────────────────────────────────────────────

  assert.equal(result.candidateId, 'disp_0004', 'candidateId must match');
  assert.ok(result.generatedAt, 'generatedAt must be set');
  assert.ok(!isNaN(Date.parse(result.generatedAt)), 'generatedAt must be a valid ISO string');
  console.log('✓ candidateId and generatedAt correct');

  assert.equal(result.shouldDispute, true, 'dc-006 should be disputable');
  console.log('✓ shouldDispute: true');

  assert.ok(
    result.meritScore >= 70,
    `meritScore should be >= 70, got ${result.meritScore}`,
  );
  console.log(`✓ meritScore: ${result.meritScore}`);

  assert.equal(
    result.recoverableCents,
    candidate.chargeAmountCents,
    `recoverableCents should equal chargeAmountCents (${candidate.chargeAmountCents})`,
  );
  console.log(`✓ recoverableCents: ${result.recoverableCents} ($${(result.recoverableCents / 100).toFixed(2)})`);

  assert.ok(
    result.draftedDisputeText.length >= 50,
    `draftedDisputeText too short (${result.draftedDisputeText.length} chars)`,
  );
  assert.ok(
    result.draftedDisputeText.length <= 1200,
    `draftedDisputeText too long (${result.draftedDisputeText.length} chars)`,
  );
  const hasMarkdown = /[*#`_]/.test(result.draftedDisputeText);
  assert.ok(!hasMarkdown, 'draftedDisputeText must not contain markdown characters');
  console.log(`✓ draftedDisputeText: ${result.draftedDisputeText.length} chars, no markdown`);

  assert.ok(
    result.evidenceCitations.length >= 1,
    'evidenceCitations must have at least 1 entry',
  );
  console.log(`✓ evidenceCitations: ${result.evidenceCitations.length} citations`);

  // ── print output for human quality review ───────────────────────────────────

  console.log('\n── Claude output ──────────────────────────────────────────────');
  console.log(`shouldDispute:      ${result.shouldDispute}`);
  console.log(`meritScore:         ${result.meritScore}`);
  console.log(`resolvedChargeType: ${result.resolvedChargeType}`);
  console.log(`recoverableCents:   ${result.recoverableCents}`);
  console.log(`\nreasoning:\n  ${result.reasoning}`);
  console.log(`\ndraftedDisputeText:\n  ${result.draftedDisputeText}`);
  console.log(`\nevidenceCitations:`);
  result.evidenceCitations.forEach((c) => console.log(`  - ${c}`));
  console.log('───────────────────────────────────────────────────────────────\n');

  console.log('All live assertions passed.');
}

main().catch((err) => {
  console.error('\nLive test FAILED:', err.message);
  process.exit(1);
});
