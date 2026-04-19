/**
 * Prompt-cache + agent-cost telemetry shapes for the W12 floating badge
 * and the per-session aggregator. All cents/tokens are integers.
 */

export interface CostTelemetryTick {
  /** Anthropic model id e.g. "claude-sonnet-4-6". */
  model: string;
  inputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  outputTokens: number;
  /** USD micro-cents (1e-6 USD), keeps integer math exact even at low rates. */
  costMicrocents: number;
  /** ISO timestamp of when this tick was emitted. */
  at: string;
  candidateId?: string;
}

export interface SessionCost {
  startedAt: string;
  /** Cumulative cost across every classifier / agent call in this session. */
  totalMicrocents: number;
  totalInputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;
  totalOutputTokens: number;
  /** Effective cache-hit rate = cacheReadTokens / (cacheReadTokens + inputTokens). */
  cacheHitRate: number;
  /** Number of classifier/agent calls aggregated into the session. */
  callCount: number;
}
