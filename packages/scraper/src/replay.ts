/**
 * S12 — Trace/replay data export.
 *
 * Fetches full run trace from TinyFish (GET /v1/runs/{id}?screenshots=base64)
 * and maps it to the ReplayArtifact type W11's scrubber consumes.
 *
 * Video URLs are presigned and expire after 15 minutes — consumer must
 * re-fetch on demand if stale.
 */

import type {
  ReplayArtifact,
  ReplayStep,
  ReplayStatus,
  StrategyEscalation,
  TinyFishEvent,
} from "@counter/types";

const TINYFISH_BASE = "https://agent.tinyfish.ai/v1";

/** Raw step from TinyFish GET /v1/runs/{id} response. */
interface RawRunStep {
  id: string;
  timestamp: string;
  status: string;
  action: string | null;
  screenshot?: string; // base64 JPEG when ?screenshots=base64
  duration?: number;
}

interface RawRunResponse {
  status: string;
  goal: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  num_of_steps: number;
  result: unknown;
  schema_validation?: unknown;
  error?: { category?: string; message?: string; retry_after?: string };
  streaming_url?: string;
  video_url?: string;
  steps: RawRunStep[];
}

function mapStatus(raw: string): ReplayStatus {
  switch (raw.toUpperCase()) {
    case "COMPLETED": return "COMPLETED";
    case "FAILED": return "FAILED";
    case "CANCELLED": return "CANCELLED";
    case "RUNNING": return "RUNNING";
    default: return "PENDING";
  }
}

export interface FetchReplayOpts {
  runId: string;
  candidateId: string;
  goal: string;
  /** If provided, these events are included in the artifact. */
  sseEvents?: TinyFishEvent[];
  /** If provided, escalation markers are included. */
  escalations?: StrategyEscalation[];
}

/**
 * Fetch a TinyFish run's full trace and map to ReplayArtifact.
 * Falls back to a minimal fixture artifact if the API is unavailable.
 */
export async function fetchReplayArtifact(
  opts: FetchReplayOpts,
): Promise<ReplayArtifact> {
  const apiKey = process.env["TINYFISH_API_KEY"];

  if (!apiKey || process.env["SCRAPER_MODE"] === "cache") {
    return buildMockReplayArtifact(opts);
  }

  const res = await fetch(
    `${TINYFISH_BASE}/runs/${opts.runId}?screenshots=base64`,
    { headers: { "X-API-Key": apiKey } },
  );

  if (!res.ok) {
    return buildMockReplayArtifact(opts);
  }

  const run = (await res.json()) as RawRunResponse;

  const steps: ReplayStep[] = run.steps.map((s, i) => ({
    id: s.id,
    index: i,
    timestamp: s.timestamp,
    status: mapStatus(s.status),
    action: s.action,
    screenshotDataUrl: s.screenshot
      ? `data:image/jpeg;base64,${s.screenshot}`
      : null,
    reasoning: null, // TinyFish doesn't provide reasoning — W11 can overlay from classifier
    durationMs: s.duration ?? null,
  }));

  return {
    runId: opts.runId,
    candidateId: opts.candidateId,
    goal: opts.goal || run.goal,
    status: mapStatus(run.status),
    createdAt: run.created_at,
    startedAt: run.started_at,
    finishedAt: run.finished_at,
    totalSteps: run.num_of_steps,
    steps,
    events: opts.sseEvents ?? [],
    escalations: opts.escalations ?? [],
    videoUrl: run.video_url ?? null,
    result: run.result,
    error: run.error
      ? { code: run.error.category, message: run.error.message ?? "Unknown error", category: run.error.category }
      : null,
  };
}

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==";

/**
 * Deterministic mock replay artifact for fixture/demo mode.
 */
function buildMockReplayArtifact(opts: FetchReplayOpts): ReplayArtifact {
  const now = new Date().toISOString();
  const t0 = new Date();

  const mockSteps: ReplayStep[] = [
    {
      id: "step_0",
      index: 0,
      timestamp: t0.toISOString(),
      status: "COMPLETED",
      action: "navigate(portal)",
      screenshotDataUrl: PIXEL,
      reasoning: "Loading merchant portal — navigating to disputes page.",
      durationMs: 1200,
    },
    {
      id: "step_1",
      index: 1,
      timestamp: new Date(t0.getTime() + 1200).toISOString(),
      status: "COMPLETED",
      action: "extract_dom(disputes_table)",
      screenshotDataUrl: PIXEL,
      reasoning: "Extracting dispute data from table rows.",
      durationMs: 800,
    },
    {
      id: "step_2",
      index: 2,
      timestamp: new Date(t0.getTime() + 2000).toISOString(),
      status: "COMPLETED",
      action: "click(dispute_button)",
      screenshotDataUrl: PIXEL,
      reasoning: "Opening dispute form for the target charge.",
      durationMs: 600,
    },
    {
      id: "step_3",
      index: 3,
      timestamp: new Date(t0.getTime() + 2600).toISOString(),
      status: "COMPLETED",
      action: "type(response_field)",
      screenshotDataUrl: PIXEL,
      reasoning: "Pasting classifier-drafted dispute text.",
      durationMs: 400,
    },
    {
      id: "step_4",
      index: 4,
      timestamp: new Date(t0.getTime() + 3000).toISOString(),
      status: "COMPLETED",
      action: "click(submit)",
      screenshotDataUrl: PIXEL,
      reasoning: "Submitting dispute and waiting for confirmation.",
      durationMs: 1500,
    },
  ];

  return {
    runId: opts.runId,
    candidateId: opts.candidateId,
    goal: opts.goal,
    status: "COMPLETED",
    createdAt: now,
    startedAt: now,
    finishedAt: new Date(t0.getTime() + 4500).toISOString(),
    totalSteps: mockSteps.length,
    steps: mockSteps,
    events: opts.sseEvents ?? [
      { type: "STARTED", runId: opts.runId, timestamp: now },
      { type: "PROGRESS", runId: opts.runId, purpose: "Loading merchant portal", timestamp: now },
      { type: "COMPLETE", runId: opts.runId, status: "COMPLETED", timestamp: new Date(t0.getTime() + 4500).toISOString() },
    ],
    escalations: opts.escalations ?? [],
    videoUrl: null,
    result: { confirmationId: "CONF-MOCK01" },
    error: null,
  };
}
