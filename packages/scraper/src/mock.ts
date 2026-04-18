import type { DisputeCandidate, SubmissionResult } from "@counter/types";
import { FIXTURE_DISPUTES } from "@counter/types";
import type { Scraper } from "./index";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deterministic demo outcomes keyed by fixture dispute ID.
// Story: 3 approved (already-recovered money shown on dashboard),
//        3 denied (all 3 trigger voice escalation — they're all auto-submit tier),
//        16 pending (the rest of the 22 submitted disputes — "resolve during demo")
//        the 4 human-review + 4 skip tier candidates are never submitted, so
//        they get no outcome row (scrapeOutcomes falls back to pending/0).
//
// Refund amounts on approved IDs match the classifier mock's recoverableCents,
// so /api/stats.totalRealizedCents lands in a consistent place regardless of
// whether outcomes are seeded via the submit path or via scrapeOutcomes.
const DEMO_OUTCOMES: Record<
  string,
  { outcome: "approved" | "denied" | "pending"; refundedCents: number }
> = {
  // --- approved: 3 early wins, already-recovered money on the dashboard ---
  "disp_0001": { outcome: "approved", refundedCents: 5390 }, // order 4472 — the demo hero
  "disp_0004": { outcome: "approved", refundedCents: 6380 }, // order 4517 — "half my order missing"
  "disp_0011": { outcome: "approved", refundedCents: 9420 }, // order 4603 — largest recovered
  // --- denied: all 3 trigger voice escalation (auto-submit tier, >= merit 70) ---
  "disp_0008": { outcome: "denied", refundedCents: 0 }, // order 4561 — chai-claim pattern
  "disp_0017": { outcome: "denied", refundedCents: 0 }, // order 4671 — wrong biryani, THE demo call
  "disp_0023": { outcome: "denied", refundedCents: 0 }, // order 4744 — cold biryani, 90-min-claim
  // --- pending: 16 auto-submit tier still adjudicating ---
  "disp_0002": { outcome: "pending", refundedCents: 0 },
  "disp_0003": { outcome: "pending", refundedCents: 0 },
  "disp_0005": { outcome: "pending", refundedCents: 0 },
  "disp_0006": { outcome: "pending", refundedCents: 0 },
  "disp_0007": { outcome: "pending", refundedCents: 0 },
  "disp_0009": { outcome: "pending", refundedCents: 0 },
  "disp_0010": { outcome: "pending", refundedCents: 0 },
  "disp_0012": { outcome: "pending", refundedCents: 0 },
  "disp_0013": { outcome: "pending", refundedCents: 0 },
  "disp_0015": { outcome: "pending", refundedCents: 0 },
  "disp_0016": { outcome: "pending", refundedCents: 0 },
  "disp_0018": { outcome: "pending", refundedCents: 0 },
  "disp_0019": { outcome: "pending", refundedCents: 0 },
  "disp_0020": { outcome: "pending", refundedCents: 0 },
  "disp_0021": { outcome: "pending", refundedCents: 0 },
  "disp_0026": { outcome: "pending", refundedCents: 0 },
};

/** IDs whose submitted outcome resolves to approved with a real refund. */
export const DEMO_APPROVED_IDS: ReadonlyArray<string> = [
  "disp_0001",
  "disp_0004",
  "disp_0011",
] as const;

/** IDs whose submitted outcome is denied — each triggers voice escalation. */
export const DEMO_DENIED_IDS: ReadonlyArray<string> = [
  "disp_0008",
  "disp_0017",
  "disp_0023",
] as const;

export const DEMO_OUTCOMES_SUMMARY = {
  totalApproved: DEMO_APPROVED_IDS.length,
  totalDenied: DEMO_DENIED_IDS.length,
  /** High-merit submitted disputes still in pending state after demo seeds. */
  totalPending: 16,
  /** Sum of approved refundedCents — the "already recovered" headline figure. */
  totalRecoveredCents: Object.values(DEMO_OUTCOMES)
    .filter((o) => o.outcome === "approved")
    .reduce((sum, o) => sum + o.refundedCents, 0),
} as const;

export function createMockScraper(opts?: { latencyMs?: number }): Scraper {
  const latency = opts?.latencyMs ?? 1200;

  return {
    async listOpenDisputes(_opts) {
      await sleep(latency);
      return FIXTURE_DISPUTES.map((d) => ({ ...d }));
    },

    async submitDispute(opts) {
      await sleep(Math.min(400, latency / 3));
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
      await sleep(Math.min(600, latency / 2));
      return opts.candidateIds.map((id) => {
        const known = DEMO_OUTCOMES[id];
        if (known) return { candidateId: id, ...known };
        // Unknown ID (skip/human-review tier, never submitted) — return pending/0
        return { candidateId: id, outcome: "pending" as const, refundedCents: 0 };
      });
    },
  };
}

// Re-export fixtures as a JSON-serialisable snapshot for non-TS consumers (Worker 3).
export function getFixtureDisputes(): DisputeCandidate[] {
  return FIXTURE_DISPUTES;
}
