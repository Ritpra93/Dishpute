/**
 * Seed the local SQLite DB with the 30 demo disputes for House of Curry.
 *
 * Usage:
 *   pnpm seed
 *
 * Idempotent — wipes all tables first, then inserts:
 *   - 30 candidates from FIXTURE_DISPUTES
 *   - 30 classifications from createMockClassifier
 *   - 22 submissions for the high-merit ones
 *   - 3 denied outcomes (escalate_to_voice = 1)  → demo's escalation candidates
 *   - 16 pending outcomes                          → "resolve" during the demo
 *   - 3 approved outcomes (refundedCents > 0)     → already-recovered money
 */

import { FIXTURE_DISPUTES } from "../lib/fixtures";
import { createMockClassifier } from "../lib/mock-classifier";
import {
  createMockScraper,
  DEMO_APPROVED_IDS,
  DEMO_DENIED_IDS,
} from "../lib/mock-scraper";
import {
  resetAllTables,
  upsertCandidate,
  upsertClassification,
  upsertOutcome,
  upsertSubmission,
} from "../lib/repo";
import type { DisputeOutcome } from "../lib/types";

// ─── Demo outcome distribution — source of truth in @counter/scraper ──────
const DENIED_IDS = new Set<string>(DEMO_DENIED_IDS);
const APPROVED_IDS = new Set<string>(DEMO_APPROVED_IDS);

async function main() {
  console.log("Resetting tables…");
  resetAllTables();

  console.log("Inserting 30 candidates…");
  const scrapedAt = new Date().toISOString();
  for (const c of FIXTURE_DISPUTES) {
    upsertCandidate(c, scrapedAt);
  }

  console.log("Classifying 30 candidates (mock)…");
  const classifier = createMockClassifier();
  const classifications = await classifier.classifyMany(FIXTURE_DISPUTES);
  for (const c of classifications) {
    upsertClassification(c);
  }

  console.log("Submitting 22 high-merit disputes (mock)…");
  const scraper = createMockScraper({ latencyMs: 0 });
  const highMerit = classifications.filter(
    (c) => c.shouldDispute && c.meritScore >= 70
  );
  for (const cls of highMerit) {
    const candidate = FIXTURE_DISPUTES.find((d) => d.id === cls.candidateId)!;
    const submission = await scraper.submitDispute({
      candidate,
      draftedText: cls.draftedDisputeText,
    });
    upsertSubmission(submission);
  }

  console.log("Recording outcomes (3 denied, 3 approved, rest pending)…");
  for (const cls of highMerit) {
    let outcome: DisputeOutcome;
    if (DENIED_IDS.has(cls.candidateId)) {
      outcome = {
        candidateId: cls.candidateId,
        outcome: "denied",
        refundedCents: 0,
        adjudicatedAt: new Date().toISOString(),
        escalateToVoice: cls.meritScore >= 70,
      };
    } else if (APPROVED_IDS.has(cls.candidateId)) {
      outcome = {
        candidateId: cls.candidateId,
        outcome: "approved",
        refundedCents: cls.recoverableCents,
        adjudicatedAt: new Date().toISOString(),
        escalateToVoice: false,
      };
    } else {
      outcome = {
        candidateId: cls.candidateId,
        outcome: "pending",
        refundedCents: 0,
        escalateToVoice: false,
      };
    }
    upsertOutcome(outcome);
  }

  console.log("\nSeed complete.");
  console.log(`  Candidates:     ${FIXTURE_DISPUTES.length}`);
  console.log(`  Classifications:${classifications.length}`);
  console.log(`  Submissions:    ${highMerit.length}`);
  console.log(`  Denied:         ${DENIED_IDS.size}`);
  console.log(`  Approved:       ${APPROVED_IDS.size}`);
  console.log(
    `  Pending:        ${highMerit.length - DENIED_IDS.size - APPROVED_IDS.size}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
