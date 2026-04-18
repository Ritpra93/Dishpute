/**
 * INLINED COPY OF @counter/scraper createMockScraper()
 *
 * MERGE NOTE: Replace this file with:
 *   export {
 *     createMockScraper,
 *     createScraper,
 *     type Scraper,
 *   } from "@counter/scraper";
 *
 * The deterministic outcome distribution below MUST match what Worker 1's mock
 * produces — 3 denied (escalateToVoice: true), 19 pending, 8 approved — so the
 * dashboard renders the same merit/recovery/escalation breakdown either way.
 */

import { FIXTURE_DISPUTES } from "./fixtures";
import type {
  DisputeCandidate,
  Scraper,
  SubmissionResult,
} from "./types";

export interface MockScraperOptions {
  /** Artificial latency to mimic TinyFish run time. Defaults to 1200ms. */
  latencyMs?: number;
}

const DENIED_IDS = new Set(["disp_0008", "disp_0017", "disp_0023"]);
const PENDING_IDS = new Set([
  "disp_0001",
  "disp_0002",
  "disp_0003",
  "disp_0004",
  "disp_0005",
  "disp_0006",
  "disp_0007",
  "disp_0009",
  "disp_0010",
  "disp_0011",
  "disp_0012",
  "disp_0013",
  "disp_0015",
  "disp_0016",
  "disp_0018",
  "disp_0019",
  "disp_0020",
  "disp_0021",
  "disp_0026",
]);

function sleep(ms: number) {
  return ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve();
}

function fakeConfirmationId(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const num = Math.abs(hash).toString(10).padStart(6, "0").slice(0, 6);
  return `CONF-${num}`;
}

export function createMockScraper(opts: MockScraperOptions = {}): Scraper {
  const latency = opts.latencyMs ?? 1200;

  return {
    async listOpenDisputes({ merchantId, platform }) {
      void merchantId;
      void platform;
      await sleep(latency);
      return FIXTURE_DISPUTES.map((d) => ({ ...d }));
    },

    async submitDispute({
      candidate,
      draftedText,
    }: {
      candidate: DisputeCandidate;
      draftedText: string;
    }): Promise<SubmissionResult> {
      void draftedText;
      await sleep(Math.min(400, latency / 3));
      return {
        candidateId: candidate.id,
        submittedAt: new Date().toISOString(),
        status: "submitted",
        platformConfirmationId: fakeConfirmationId(candidate.id),
      };
    },

    async scrapeOutcomes({ candidateIds }) {
      await sleep(Math.min(600, latency / 2));
      return candidateIds.map((id) => {
        if (DENIED_IDS.has(id)) {
          return { candidateId: id, outcome: "denied" as const, refundedCents: 0 };
        }
        if (PENDING_IDS.has(id)) {
          return { candidateId: id, outcome: "pending" as const, refundedCents: 0 };
        }
        return {
          candidateId: id,
          outcome: "approved" as const,
          refundedCents: 0,
        };
      });
    },
  };
}

export function createScraper(): Scraper {
  throw new Error(
    "createScraper (real TinyFish) is owned by Worker 1 (@counter/scraper). " +
      "Use createMockScraper() until that ships."
  );
}
