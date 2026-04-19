/**
 * S3 — Self-healing retry with strategy switch.
 *
 * Wraps runTinyFishSSE with a strategy chain that emits Counter-only
 * synthetic events (FALLBACK_ENGAGED, STRATEGY_ESCALATED) into the same
 * stream so W2/W11 can render them alongside real TinyFish events.
 *
 * Strategy chain: lite → stealth → cache fallback → throw
 */

import type {
  TinyFishEvent,
  FallbackEngagedEvent,
  StrategyEscalatedEvent,
} from "@counter/types";
import { runTinyFishSSE, type TinyFishRunParams } from "./tinyfish";

export type RetryStrategy = "lite" | "stealth" | "cache";

export interface RetryOptions {
  /** Base params (url, goal, etc). browser_profile is overridden per strategy. */
  params: Omit<TinyFishRunParams, "browser_profile">;
  /** Run ID to attach to synthetic events. Falls back to "unknown". */
  runId?: string;
  /** Strategy chain to attempt in order. Defaults to ["lite", "stealth", "cache"]. */
  strategies?: RetryStrategy[];
}

/**
 * Async generator that tries each strategy in order. On failure, yields a
 * synthetic FALLBACK_ENGAGED event and moves to the next strategy. If the
 * "cache" strategy is reached, it does NOT call TinyFish — the caller is
 * responsible for returning fixture data when they see the cache signal.
 *
 * Yields: all TinyFishEvent from the successful run, plus any synthetic
 * FALLBACK_ENGAGED / STRATEGY_ESCALATED events injected between retries.
 */
export async function* runWithRetry(
  opts: RetryOptions,
): AsyncGenerator<TinyFishEvent | FallbackEngagedEvent | StrategyEscalatedEvent> {
  const strategies = opts.strategies ?? ["lite", "stealth", "cache"];
  const runId = opts.runId ?? "unknown";
  let lastError: Error | undefined;

  for (let i = 0; i < strategies.length; i++) {
    const strategy = strategies[i]!;

    // "cache" is a terminal signal — yield the event and return.
    // Caller checks for this and returns fixture data.
    if (strategy === "cache") {
      if (process.env["SCRAPER_MODE"] !== "cache") {
        // Cache strategy only valid when kill-switch is set.
        // If not set, skip to next strategy (or throw if last).
        lastError = lastError ?? new Error("All TinyFish strategies exhausted and SCRAPER_MODE !== cache");
        continue;
      }

      const fallbackEvt: FallbackEngagedEvent = {
        type: "FALLBACK_ENGAGED",
        runId,
        fallback: "manual_handoff",
        reason: `All browser strategies failed — falling back to cached fixtures`,
        timestamp: new Date().toISOString(),
      };
      yield fallbackEvt;
      // Signal to caller: return fixtures. We use a special COMPLETE with
      // result: { __cache_fallback: true } so the caller can detect it.
      yield {
        type: "COMPLETE",
        runId,
        status: "COMPLETED",
        result: { __cache_fallback: true },
        timestamp: new Date().toISOString(),
      } as TinyFishEvent;
      return;
    }

    // Emit fallback event if this isn't the first strategy.
    if (i > 0) {
      const escalation: FallbackEngagedEvent = {
        type: "FALLBACK_ENGAGED",
        runId,
        fallback: "stealth_profile",
        reason: `Strategy "${strategies[i - 1]}" failed: ${lastError?.message ?? "unknown"} — switching to "${strategy}"`,
        timestamp: new Date().toISOString(),
      };
      yield escalation;
    }

    try {
      const profile = strategy as "lite" | "stealth";
      const stream = runTinyFishSSE({
        ...opts.params,
        browser_profile: profile,
      });

      // Forward all events from the underlying stream.
      let gotComplete = false;
      for await (const evt of stream) {
        yield evt;
        if (evt.type === "COMPLETE") {
          gotComplete = true;
        }
      }

      if (gotComplete) {
        // Success — done.
        return;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Fall through to next strategy.
    }
  }

  // All strategies exhausted.
  throw lastError ?? new Error("All TinyFish retry strategies exhausted");
}

/**
 * Convenience: consume the retry generator and return only the final result.
 * Returns `{ result, events }` so callers can access both the data and the
 * event log (useful for evidence bundles / replay).
 */
export async function runWithRetryResult(
  opts: RetryOptions,
): Promise<{ result: unknown; events: TinyFishEvent[]; usedCache: boolean }> {
  const events: TinyFishEvent[] = [];
  let finalResult: unknown = undefined;
  let usedCache = false;

  for await (const evt of runWithRetry(opts)) {
    events.push(evt as TinyFishEvent);

    if (evt.type === "COMPLETE" && evt.status === "COMPLETED") {
      const r = evt.result as Record<string, unknown> | undefined;
      if (r && r["__cache_fallback"] === true) {
        usedCache = true;
      } else {
        finalResult = evt.result;
      }
    }
  }

  return { result: finalResult, events, usedCache };
}
