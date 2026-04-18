import type { DisputeCandidate, SubmissionResult } from "@counter/types";
import { FIXTURE_DISPUTES } from "@counter/types";
import type { Scraper } from "./index";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deterministic demo outcomes keyed by fixture dispute ID.
// Story: 22 approved (~$428 recovered), 1 denied (triggers voice escalation), 7 pending.
//
// Approved: all 15 missing_item + all 6 wrong_item + dc_026 (order_never_arrived,
//           "driver photo shows wrong address" — airtight case)
// Denied:   dc_022 (cold_food, "completely cold and old, I want full refund" —
//           delivery time was 52 min; platform sides with customer)
// Pending:  dc_023–dc_025 (cold_food, gray area), dc_027–dc_028 (order_never_arrived,
//           still processing), dc_029–dc_030 (customer_cancel, hardest to win)
const DEMO_OUTCOMES: Record<
  string,
  { outcome: "approved" | "denied" | "pending"; refundedCents: number }
> = {
  // --- approved: missing_item (dc_001–dc_015) ---
  dc_001: { outcome: "approved", refundedCents: 1499 },
  dc_002: { outcome: "approved", refundedCents: 899 },
  dc_003: { outcome: "approved", refundedCents: 2199 },
  dc_004: { outcome: "approved", refundedCents: 1299 },
  dc_005: { outcome: "approved", refundedCents: 3499 },
  dc_006: { outcome: "approved", refundedCents: 799 },
  dc_007: { outcome: "approved", refundedCents: 1599 },
  dc_008: { outcome: "approved", refundedCents: 999 },
  dc_009: { outcome: "approved", refundedCents: 2499 },
  dc_010: { outcome: "approved", refundedCents: 1199 },
  dc_011: { outcome: "approved", refundedCents: 4299 },
  dc_012: { outcome: "approved", refundedCents: 699 },
  dc_013: { outcome: "approved", refundedCents: 1899 },
  dc_014: { outcome: "approved", refundedCents: 1099 },
  dc_015: { outcome: "approved", refundedCents: 2799 },
  // --- approved: wrong_item (dc_016–dc_021) ---
  dc_016: { outcome: "approved", refundedCents: 1599 },
  dc_017: { outcome: "approved", refundedCents: 2299 },
  dc_018: { outcome: "approved", refundedCents: 999 },
  dc_019: { outcome: "approved", refundedCents: 1799 },
  dc_020: { outcome: "approved", refundedCents: 1299 },
  dc_021: { outcome: "approved", refundedCents: 2099 },
  // --- denied: cold_food with suspicious "full refund" claim (triggers voice escalation) ---
  dc_022: { outcome: "denied", refundedCents: 0 },
  // --- pending: cold_food (gray area) ---
  dc_023: { outcome: "pending", refundedCents: 0 },
  dc_024: { outcome: "pending", refundedCents: 0 },
  dc_025: { outcome: "pending", refundedCents: 0 },
  // --- approved: order_never_arrived with GPS mismatch evidence ---
  dc_026: { outcome: "approved", refundedCents: 5499 },
  // --- pending: order_never_arrived (still processing) ---
  dc_027: { outcome: "pending", refundedCents: 0 },
  dc_028: { outcome: "pending", refundedCents: 0 },
  // --- pending: customer_cancel (hardest to win) ---
  dc_029: { outcome: "pending", refundedCents: 0 },
  dc_030: { outcome: "pending", refundedCents: 0 },
};

// Total approved: $428.78 across 22 disputes.
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
