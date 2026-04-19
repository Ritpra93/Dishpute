import type { DisputeCandidate, SubmissionResult } from "@counter/types";
import { FIXTURE_DISPUTES } from "@counter/types";
import {
  createMockScraper,
  DEMO_APPROVED_IDS,
  DEMO_DENIED_IDS,
  DEMO_OUTCOMES_SUMMARY,
} from "./mock";
import { listOpenDisputes, listOpenDisputesSSE, listOpenDisputesWithEvents, submitDispute, scrapeOutcomes } from "./doordash";
import { submitDisputeBatch } from "./batch";

// S2: Re-export the SSE generator + types so W2/W11 can consume raw events.
export { runTinyFishSSE, runTinyFish } from "./tinyfish";
export type { TinyFishRunParams, TinyFishEvent } from "./tinyfish";

// S3: Self-healing retry with strategy switch.
export { runWithRetry, runWithRetryResult } from "./retry";
export type { RetryStrategy, RetryOptions } from "./retry";

// S1: Batch primitives for direct use.
export { runTinyFishBatch, submitDisputeBatch } from "./batch";
export type { BatchRunSpec, BatchResult } from "./batch";

export interface Scraper {
  listOpenDisputes(opts: { merchantId: string; platform: "doordash" }): Promise<DisputeCandidate[]>;
  submitDispute(opts: { candidate: DisputeCandidate; draftedText: string }): Promise<SubmissionResult>;
  /** S1: Submit multiple disputes in one atomic batch call. */
  submitBatch(items: Array<{ candidate: DisputeCandidate; draftedText: string }>): Promise<SubmissionResult[]>;
  scrapeOutcomes(opts: {
    candidateIds: string[];
  }): Promise<Array<{ candidateId: string; outcome: "approved" | "denied" | "pending"; refundedCents: number }>>;
}

export function createScraper(opts: { tinyFishApiKey: string }): Scraper {
  // Set the API key into the environment for the tinyfish module.
  // In a long-running server you'd pass this through context instead.
  process.env["TINYFISH_API_KEY"] = opts.tinyFishApiKey;

  return {
    async listOpenDisputes(_opts) {
      // If kill-switch is set, return fixtures immediately
      if (process.env["SCRAPER_MODE"] === "cache") {
        await new Promise((r) => setTimeout(r, 1200));
        return FIXTURE_DISPUTES;
      }
      return listOpenDisputes();
    },

    async submitDispute(submitOpts) {
      if (process.env["SCRAPER_MODE"] === "cache") {
        await new Promise((r) => setTimeout(r, 1200));
        const confId = `CONF-${Math.floor(100000 + Math.random() * 900000)}`;
        return {
          candidateId: submitOpts.candidate.id,
          submittedAt: new Date().toISOString(),
          status: "submitted",
          platformConfirmationId: confId,
        };
      }
      return submitDispute(submitOpts);
    },

    async submitBatch(items) {
      if (process.env["SCRAPER_MODE"] === "cache") {
        await new Promise((r) => setTimeout(r, 800));
        return items.map(({ candidate }) => ({
          candidateId: candidate.id,
          submittedAt: new Date().toISOString(),
          status: "submitted" as const,
          platformConfirmationId: `CONF-${Math.floor(100000 + Math.random() * 900000)}`,
        }));
      }
      return submitDisputeBatch(items);
    },

    async scrapeOutcomes(outcomesOpts) {
      if (process.env["SCRAPER_MODE"] === "cache") {
        // Delegate to mock so the demo outcomes table (22 approved / 1 denied / 7 pending)
        // is consistent whether SCRAPER_MODE=cache or createMockScraper() is used directly.
        return createMockScraper({ latencyMs: 1200 }).scrapeOutcomes(outcomesOpts);
      }
      return scrapeOutcomes(outcomesOpts);
    },
  };
}

export {
  createMockScraper,
  DEMO_APPROVED_IDS,
  DEMO_DENIED_IDS,
  DEMO_OUTCOMES_SUMMARY,
};

// S3: SSE-aware list variants for W2 live grid.
export { listOpenDisputesSSE, listOpenDisputesWithEvents };

// S5: 86-item multi-portal toggle.
export { eightySixItem, unEightySixItem } from "./ops";
export type { EightySixOpts, EightySixResult } from "./ops";

// S4: Evidence bundle builder.
export { buildEvidenceBundle, buildMockEvidenceBundle } from "./evidence";
export type { BuildEvidenceOpts } from "./evidence";

// S12: Trace/replay data export.
export { fetchReplayArtifact } from "./replay";
export type { FetchReplayOpts } from "./replay";
