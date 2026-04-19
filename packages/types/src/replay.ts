/**
 * Replay artifact powering the W11 timeline scrubber. Mirrors the
 * `/v1/runs/{id}?screenshots=base64` payload shape (verified 2026-04-18)
 * so the fixture and the real call are interchangeable.
 */

import type { TinyFishEvent } from "./events";

export type ReplayStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface ReplayStep {
  id: string;
  index: number;
  timestamp: string;
  status: ReplayStatus;
  action: string | null;
  /** Base64 JPEG data URL or null if screenshots weren't captured. */
  screenshotDataUrl: string | null;
  /** Free-form reasoning text for the right-hand "thinking" pane. */
  reasoning: string | null;
  durationMs: number | null;
}

export interface StrategyEscalation {
  /** Step index where Claude pivoted from auto → high thinking. */
  atStepIndex: number;
  fromMode: "auto" | "default";
  toMode: "high" | "strict";
  reason: string;
  timestamp: string;
}

export interface ReplayArtifact {
  runId: string;
  candidateId: string;
  goal: string;
  status: ReplayStatus;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  totalSteps: number;
  steps: ReplayStep[];
  /** Distinct visual markers on the timeline (W2 union events). */
  events: TinyFishEvent[];
  escalations: StrategyEscalation[];
  /** Presigned video URL — expires after 15 minutes. */
  videoUrl: string | null;
  result: unknown;
  error: { code?: string; message: string; category?: string } | null;
}
