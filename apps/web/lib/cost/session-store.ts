/**
 * Process-local session-cost aggregator powering the W12 CostBadge. Lives in
 * memory only — the demo doesn't persist costs across server restarts.
 *
 * Anyone running a classifier/agent call can call `recordCostTick(...)` and
 * the badge SSE will fan out an updated SessionCost.
 */

import type { CostTelemetryTick, SessionCost } from "@counter/types";

type Listener = (cost: SessionCost) => void;

interface CostState {
  startedAt: string;
  totalMicrocents: number;
  totalInputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalOutputTokens: number;
  callCount: number;
}

const GLOBAL = globalThis as unknown as {
  __counterCostState?: CostState;
  __counterCostListeners?: Set<Listener>;
};

function getState(): CostState {
  if (!GLOBAL.__counterCostState) {
    GLOBAL.__counterCostState = {
      startedAt: new Date().toISOString(),
      totalMicrocents: 0,
      totalInputTokens: 0,
      totalCacheReadTokens: 0,
      totalCacheCreationTokens: 0,
      totalOutputTokens: 0,
      callCount: 0,
    };
  }
  return GLOBAL.__counterCostState;
}

function getListeners(): Set<Listener> {
  if (!GLOBAL.__counterCostListeners) GLOBAL.__counterCostListeners = new Set();
  return GLOBAL.__counterCostListeners;
}

export function getSessionCost(): SessionCost {
  const s = getState();
  const denom = s.totalCacheReadTokens + s.totalInputTokens;
  return {
    startedAt: s.startedAt,
    totalMicrocents: s.totalMicrocents,
    totalInputTokens: s.totalInputTokens,
    totalCacheReadTokens: s.totalCacheReadTokens,
    totalCacheCreationTokens: s.totalCacheCreationTokens,
    totalOutputTokens: s.totalOutputTokens,
    cacheHitRate: denom > 0 ? s.totalCacheReadTokens / denom : 0,
    callCount: s.callCount,
  };
}

export function recordCostTick(tick: CostTelemetryTick): SessionCost {
  const s = getState();
  s.totalMicrocents += tick.costMicrocents;
  s.totalInputTokens += tick.inputTokens;
  s.totalCacheReadTokens += tick.cacheReadTokens;
  s.totalCacheCreationTokens += tick.cacheCreationTokens;
  s.totalOutputTokens += tick.outputTokens;
  s.callCount += 1;
  const cost = getSessionCost();
  for (const l of getListeners()) {
    try {
      l(cost);
    } catch {
      // ignore listener crash
    }
  }
  return cost;
}

export function subscribeCost(listener: Listener): () => void {
  const set = getListeners();
  set.add(listener);
  return () => set.delete(listener);
}

/** Demo-only: synthesise a tick so the CostBadge has something to animate. */
export function recordDemoTick(): SessionCost {
  const inputTokens = 280 + Math.floor(Math.random() * 220);
  const cacheReadTokens = 1200 + Math.floor(Math.random() * 800);
  const outputTokens = 120 + Math.floor(Math.random() * 180);
  // Sonnet 4 priced @ $3 / 1M input, $15 / 1M output, $0.30 / 1M cache reads.
  // Convert to USD microcents (1e-6 USD): 1e-6 USD = 1e-4 cents = "microcent".
  // 1 USD = 1e6 microcents. (input/1e6) * $3 = (input * 3) microcents.
  const costMicrocents =
    inputTokens * 3 + cacheReadTokens * 0.3 + outputTokens * 15;
  return recordCostTick({
    model: "claude-sonnet-4-6",
    inputTokens,
    cacheReadTokens,
    cacheCreationTokens: 0,
    outputTokens,
    costMicrocents: Math.round(costMicrocents),
    at: new Date().toISOString(),
  });
}
