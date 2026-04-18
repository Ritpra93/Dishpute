import type { DisputeCandidate, SubmissionResult } from "@counter/types";
import { FIXTURE_DISPUTES } from "@counter/types";
import {
  createMockScraper,
  DEMO_APPROVED_IDS,
  DEMO_DENIED_IDS,
  DEMO_OUTCOMES_SUMMARY,
} from "./mock";
import { listOpenDisputes, submitDispute, scrapeOutcomes } from "./doordash";

export interface Scraper {
  listOpenDisputes(opts: { merchantId: string; platform: "doordash" }): Promise<DisputeCandidate[]>;
  submitDispute(opts: { candidate: DisputeCandidate; draftedText: string }): Promise<SubmissionResult>;
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
