import type { DisputeCandidate, SubmissionResult } from "@counter/types";
import { FIXTURE_DISPUTES } from "@counter/types";
import type { Scraper } from "./index";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deterministic demo outcomes keyed by fixture dispute ID.
// Story: 22 approved (~$858 recovered), 1 denied (triggers voice escalation), 7 pending.
//
// Approved: dc-001..dc-021 (auto-submit tier, all clean wins) + dc-026
//           (human-review missing_item with first-time-customer signal — adjudicates approved)
// Denied:   dc-022 (auto-submit tier missing_item, but customer has 4 prior refunds in 90
//           days — platform sides with the abuse pattern; triggers voice escalation)
// Pending:  dc-023, dc-024, dc-025 (human-review tier, still adjudicating) +
//           dc-027 (order_never_arrived), dc-028 (customer_cancel, hardest to win),
//           dc-029, dc-030 (skip tier, never submitted by us so platform side never decides)
const DEMO_OUTCOMES: Record<
  string,
  { outcome: "approved" | "denied" | "pending"; refundedCents: number }
> = {
  // --- approved: auto-submit tier (dc-001..dc-021) ---
  "dc-001": { outcome: "approved", refundedCents: 5200 },
  "dc-002": { outcome: "approved", refundedCents: 3800 },
  "dc-003": { outcome: "approved", refundedCents: 4400 },
  "dc-004": { outcome: "approved", refundedCents: 2800 },
  "dc-005": { outcome: "approved", refundedCents: 2200 },
  "dc-006": { outcome: "approved", refundedCents: 6000 },
  "dc-007": { outcome: "approved", refundedCents: 4200 },
  "dc-008": { outcome: "approved", refundedCents: 3500 },
  "dc-009": { outcome: "approved", refundedCents: 1800 },
  "dc-010": { outcome: "approved", refundedCents: 3200 },
  "dc-011": { outcome: "approved", refundedCents: 4800 },
  "dc-012": { outcome: "approved", refundedCents: 2500 },
  "dc-013": { outcome: "approved", refundedCents: 7200 },
  "dc-014": { outcome: "approved", refundedCents: 2000 },
  "dc-015": { outcome: "approved", refundedCents: 5000 },
  "dc-016": { outcome: "approved", refundedCents: 4500 },
  "dc-017": { outcome: "approved", refundedCents: 4200 },
  "dc-018": { outcome: "approved", refundedCents: 2800 },
  "dc-019": { outcome: "approved", refundedCents: 5000 },
  "dc-020": { outcome: "approved", refundedCents: 3500 },
  "dc-021": { outcome: "approved", refundedCents: 3000 },
  // --- denied: auto-submit tier with suspicious refund-history pattern (triggers voice escalation) ---
  "dc-022": { outcome: "denied", refundedCents: 0 },
  // --- pending: human-review tier (still adjudicating) ---
  "dc-023": { outcome: "pending", refundedCents: 0 },
  "dc-024": { outcome: "pending", refundedCents: 0 },
  "dc-025": { outcome: "pending", refundedCents: 0 },
  // --- approved: human-review missing_item with first-time-customer signal ---
  "dc-026": { outcome: "approved", refundedCents: 4200 },
  // --- pending: skip tier (we never submitted, so no platform-side outcome yet) ---
  "dc-027": { outcome: "pending", refundedCents: 0 },
  "dc-028": { outcome: "pending", refundedCents: 0 },
  "dc-029": { outcome: "pending", refundedCents: 0 },
  "dc-030": { outcome: "pending", refundedCents: 0 },
};

// Total approved: $858.00 across 22 disputes.
export const DEMO_OUTCOMES_SUMMARY = {
  totalApproved: 22,
  totalDenied: 1,
  totalPending: 7,
  totalRecoveredCents: Object.values(DEMO_OUTCOMES).reduce((sum, o) => sum + o.refundedCents, 0),
} as const;

export function createMockScraper(opts?: { latencyMs?: number }): Scraper {
  const latency = opts?.latencyMs ?? 1200;

  return {
    async listOpenDisputes(_opts) {
      await sleep(latency);
      return FIXTURE_DISPUTES;
    },

    async submitDispute(opts) {
      await sleep(latency);
      const confId = `CONF-${Math.floor(100000 + Math.random() * 900000)}`;
      const result: SubmissionResult = {
        candidateId: opts.candidate.id,
        submittedAt: new Date().toISOString(),
        status: "submitted",
        platformConfirmationId: confId,
      };
      return result;
    },

    async scrapeOutcomes(opts) {
      await sleep(latency);
      return opts.candidateIds.map((id) => {
        const known = DEMO_OUTCOMES[id];
        if (known) return { candidateId: id, ...known };
        // Unknown ID — return pending so callers don't blow up
        return { candidateId: id, outcome: "pending" as const, refundedCents: 0 };
      });
    },
  };
}

// Re-export fixtures as a JSON-serialisable snapshot for non-TS consumers (Worker 3).
export function getFixtureDisputes(): DisputeCandidate[] {
  return FIXTURE_DISPUTES;
}
