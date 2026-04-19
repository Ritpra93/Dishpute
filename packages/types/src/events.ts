/**
 * TinyFish SSE event union + Counter-only synthetic events.
 *
 * Verified against `https://docs.tinyfish.ai/api-reference/automation/run-browser-automation-with-sse-streaming.md`
 * (fetched 2026-04-18). Synthetic events live alongside so W2/W11 can render
 * the same union from either real or fixture sources.
 */

export type TinyFishEventType =
  | "STARTED"
  | "STREAMING_URL"
  | "PROGRESS"
  | "TF_API_RESULT"
  | "HEARTBEAT"
  | "COMPLETE"
  // Counter-only synthetic markers — never emitted by TinyFish itself.
  | "STRATEGY_ESCALATED"
  | "FALLBACK_ENGAGED";

export interface TinyFishStartedEvent {
  type: "STARTED";
  runId: string;
  timestamp: string;
}

export interface TinyFishStreamingUrlEvent {
  type: "STREAMING_URL";
  runId: string;
  streamingUrl: string;
  timestamp: string;
}

export interface TinyFishProgressEvent {
  type: "PROGRESS";
  runId: string;
  purpose: string;
  tinyfishApi?: "search" | "fetch";
  timestamp: string;
}

export interface TinyFishApiResultEvent {
  type: "TF_API_RESULT";
  runId: string;
  tinyfishApi: "search" | "fetch";
  result: unknown[];
  timestamp: string;
}

export interface TinyFishHeartbeatEvent {
  type: "HEARTBEAT";
  timestamp: string;
}

export interface TinyFishCompleteEvent {
  type: "COMPLETE";
  runId: string;
  status: "COMPLETED" | "FAILED" | "CANCELLED";
  result?: unknown;
  error?: string;
  helpUrl?: string;
  helpMessage?: string;
  timestamp: string;
}

/** Counter-only — emitted by our SSE re-broadcast when Claude pivots to high thinking. */
export interface StrategyEscalatedEvent {
  type: "STRATEGY_ESCALATED";
  runId: string;
  fromMode: "auto" | "default";
  toMode: "high" | "strict";
  reason: string;
  timestamp: string;
}

/** Counter-only — emitted when scraper retries with the stealth profile after SITE_BLOCKED. */
export interface FallbackEngagedEvent {
  type: "FALLBACK_ENGAGED";
  runId: string;
  fallback: "stealth_profile" | "manual_handoff";
  reason: string;
  timestamp: string;
}

export type TinyFishEvent =
  | TinyFishStartedEvent
  | TinyFishStreamingUrlEvent
  | TinyFishProgressEvent
  | TinyFishApiResultEvent
  | TinyFishHeartbeatEvent
  | TinyFishCompleteEvent
  | StrategyEscalatedEvent
  | FallbackEngagedEvent;

/**
 * Higher-level dashboard event the W2 grid + W7 widget react to. Wraps
 * raw TinyFish events with the Counter-side context (which platform, which
 * dispute) the UI needs but TinyFish doesn't know about.
 */
export interface AgentEvent {
  channel: "ubereats" | "doordash" | "grubhub";
  candidateId?: string;
  event: TinyFishEvent;
}

/**
 * One block from Claude's adaptive-thinking stream. W10's reasoning panel
 * renders these as a scrollable feed.
 */
export interface ThinkingBlock {
  id: string;
  candidateId: string;
  mode: "auto" | "high";
  text: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: unknown;
  timestamp: string;
}
