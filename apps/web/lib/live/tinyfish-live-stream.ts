/**
 * Merges three concurrent TinyFish SSE runs (one per platform) into a single
 * AsyncGenerator<AgentEvent>. Used by /api/live/stream when LIVE_MODE=tinyfish.
 *
 * COMPLETE events are transformed to include recovered_cents (summed from the
 * dispute array TinyFish returns) so live-grid.tsx can tally recovered funds.
 */

import { runTinyFishSSE } from "@counter/scraper";
import type { AgentEvent } from "@/lib/types";
import type { TinyFishEvent } from "@counter/types";

type Channel = "doordash" | "ubereats" | "grubhub";

/** Goal shared across all three channels — same DOM contract as doordash.ts. */
const LIST_GOAL = `
Navigate to the disputes table at this URL.
For each row in the table, extract the following data attributes:
- dispute_id (from data-dispute-id attribute)
- charge_amount_cents (integer, from data-charge-cents attribute)

After collecting all rows, return ONLY a JSON object with this shape (no commentary, no markdown):
{ "recovered_cents": <sum of all charge_amount_cents>, "filed": <number of rows> }
`.trim();

/**
 * Given a TinyFish COMPLETE result, extract { recovered_cents, filed }.
 * Handles both array results (from full list goals) and summary objects.
 */
function extractSummary(result: unknown): { recovered_cents: number; filed: number } {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const r = result as Record<string, unknown>;
    const recovered = Number(r["recovered_cents"] ?? 0);
    const filed = Number(r["filed"] ?? 0);
    if (recovered > 0 || filed > 0) return { recovered_cents: recovered, filed };
  }
  if (Array.isArray(result)) {
    const total = result.reduce((sum: number, row: unknown) => {
      const cents = Number((row as Record<string, unknown>)["chargeAmountCents"] ?? 0);
      return sum + cents;
    }, 0);
    return { recovered_cents: total, filed: result.length };
  }
  return { recovered_cents: 0, filed: 0 };
}

/**
 * Runs three TinyFish SSE generators concurrently and merges their events
 * into a single stream tagged with channel. Events arrive in real time as
 * each generator yields them; no sorting or buffering by timestamp.
 */
export async function* mergeLiveTinyFishStreams(
  base: string,
): AsyncGenerator<AgentEvent> {
  const channels: Array<{ channel: Channel; url: string }> = [
    { channel: "doordash", url: `${base}/mock-portal/disputes` },
    { channel: "ubereats", url: `${base}/mock-portal-ubereats/disputes` },
    { channel: "grubhub",  url: `${base}/mock-portal-grubhub/disputes` },
  ];

  const pending: AgentEvent[] = [];
  let remaining = channels.length;
  let notify: (() => void) | null = null;

  function wake() {
    const fn = notify;
    notify = null;
    fn?.();
  }

  const runners = channels.map(({ channel, url }) =>
    (async () => {
      try {
        for await (const raw of runTinyFishSSE({ url, goal: LIST_GOAL, browser_profile: "lite" })) {
          let event: TinyFishEvent = raw;
          if (raw.type === "COMPLETE" && raw.status === "COMPLETED") {
            const summary = extractSummary(raw.result);
            event = { ...raw, result: summary };
          }
          pending.push({ channel, event });
          wake();
        }
      } catch (err) {
        pending.push({
          channel,
          event: {
            type: "COMPLETE",
            runId: `run_${channel}_err`,
            status: "FAILED",
            error: String(err),
            timestamp: new Date().toISOString(),
          },
        });
        wake();
      } finally {
        remaining--;
        wake();
      }
    })()
  );

  while (remaining > 0 || pending.length > 0) {
    if (pending.length === 0) {
      await new Promise<void>((r) => {
        notify = r;
      });
    }
    while (pending.length > 0) {
      yield pending.shift()!;
    }
  }

  await Promise.all(runners);
}
