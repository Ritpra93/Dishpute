// Verified against docs/VERIFIED_APIS.md — TinyFish section.
// Endpoint: POST https://agent.tinyfish.ai/v1/automation/run-sse
// Auth: X-API-Key header (NOT Authorization: Bearer)
// Terminal event: type === "COMPLETE", status === "COMPLETED", data in `result`
// NOTE: live API uses `result`, NOT `resultJson` (docs are wrong — verified 2026-04-18)
// No typed SDK — plain fetch + SSE.

import type {
  TinyFishEvent,
  TinyFishStartedEvent,
  TinyFishStreamingUrlEvent,
  TinyFishProgressEvent,
  TinyFishApiResultEvent,
  TinyFishHeartbeatEvent,
  TinyFishCompleteEvent,
} from "@counter/types";

export type { TinyFishEvent };

const TINYFISH_SSE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export interface TinyFishRunParams {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: { enabled: boolean; country_code: string };
  /** Vault integration — pass through to TinyFish request body. */
  use_vault?: boolean;
  credential_item_ids?: string[];
  /** Capture config for evidence/replay. */
  capture_config?: {
    elements?: boolean;
    snapshots?: boolean;
    screenshots?: boolean;
    recording?: boolean;
  };
}

/**
 * Raw SSE wire event before we map to the typed union.
 * TinyFish uses snake_case; we normalize to camelCase in the mapper.
 */
interface RawSSEEvent {
  type: string;
  status?: string;
  run_id?: string;
  streaming_url?: string;
  purpose?: string;
  tinyfish_api?: "search" | "fetch";
  result?: unknown;
  error?: string;
  help_url?: string;
  help_message?: string;
  message?: string;
  timestamp?: string;
}

/** Map a raw TinyFish SSE JSON blob to our typed event union. */
function mapRawEvent(raw: RawSSEEvent): TinyFishEvent {
  const ts = raw.timestamp ?? new Date().toISOString();

  switch (raw.type) {
    case "STARTED":
      return {
        type: "STARTED",
        runId: raw.run_id ?? "",
        timestamp: ts,
      } satisfies TinyFishStartedEvent;

    case "STREAMING_URL":
      return {
        type: "STREAMING_URL",
        runId: raw.run_id ?? "",
        streamingUrl: raw.streaming_url ?? "",
        timestamp: ts,
      } satisfies TinyFishStreamingUrlEvent;

    case "PROGRESS":
      return {
        type: "PROGRESS",
        runId: raw.run_id ?? "",
        purpose: raw.purpose ?? raw.message ?? "",
        ...(raw.tinyfish_api ? { tinyfishApi: raw.tinyfish_api } : {}),
        timestamp: ts,
      } satisfies TinyFishProgressEvent;

    case "TF_API_RESULT":
      return {
        type: "TF_API_RESULT",
        runId: raw.run_id ?? "",
        tinyfishApi: raw.tinyfish_api ?? "fetch",
        result: Array.isArray(raw.result) ? raw.result : [],
        timestamp: ts,
      } satisfies TinyFishApiResultEvent;

    case "HEARTBEAT":
      return {
        type: "HEARTBEAT",
        timestamp: ts,
      } satisfies TinyFishHeartbeatEvent;

    case "COMPLETE":
      return {
        type: "COMPLETE",
        runId: raw.run_id ?? "",
        status: (raw.status as "COMPLETED" | "FAILED" | "CANCELLED") ?? "FAILED",
        ...(raw.result !== undefined ? { result: raw.result } : {}),
        ...(raw.error ? { error: raw.error } : {}),
        ...(raw.help_url ? { helpUrl: raw.help_url } : {}),
        ...(raw.help_message ? { helpMessage: raw.help_message } : {}),
        timestamp: ts,
      } satisfies TinyFishCompleteEvent;

    default:
      // Unknown event type — surface as PROGRESS so the stream doesn't break.
      return {
        type: "PROGRESS",
        runId: raw.run_id ?? "",
        purpose: `[unknown event: ${raw.type}] ${raw.message ?? ""}`.trim(),
        timestamp: ts,
      } satisfies TinyFishProgressEvent;
  }
}

/**
 * Core SSE async generator. Yields every TinyFish event as a typed union
 * member. Consumers (W2 live grid, W11 replay, S3 retry logic) iterate
 * this directly. The final COMPLETE event is yielded, then the generator
 * returns.
 *
 * Throws on HTTP errors and FAILED status.
 */
export async function* runTinyFishSSE(
  params: TinyFishRunParams,
): AsyncGenerator<TinyFishEvent> {
  const res = await fetch(TINYFISH_SSE_URL, {
    method: "POST",
    headers: {
      "X-API-Key": process.env["TINYFISH_API_KEY"]!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    throw new Error(`TinyFish ${res.status}: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw: RawSSEEvent = JSON.parse(line.slice(6)) as RawSSEEvent;
      const evt = mapRawEvent(raw);

      // Yield every event — consumers decide what to do with each.
      yield evt;

      // Terminal: COMPLETE with FAILED status → throw after yielding.
      if (evt.type === "COMPLETE" && evt.status === "FAILED") {
        throw new Error(`TinyFish run failed: ${JSON.stringify(evt)}`);
      }

      // Terminal: COMPLETE with COMPLETED → check the goal-failure trap, then return.
      if (evt.type === "COMPLETE" && evt.status === "COMPLETED") {
        const result = evt.result as Record<string, unknown> | null | undefined;
        if (result && typeof result === "object" && result["status"] === "failure") {
          throw new Error(`TinyFish goal failed: ${JSON.stringify(result)}`);
        }
        return;
      }
    }
  }

  throw new Error("TinyFish stream ended without COMPLETE event");
}

/**
 * Convenience wrapper — consumes the full SSE stream and returns only the
 * final result. Signature-compatible with the original runTinyFish so
 * doordash.ts doesn't need changes until S3 lands.
 */
export async function runTinyFish(params: TinyFishRunParams): Promise<unknown> {
  for await (const evt of runTinyFishSSE(params)) {
    if (evt.type === "COMPLETE" && evt.status === "COMPLETED") {
      return evt.result;
    }
    // FAILED case is thrown inside the generator — propagates here automatically.
  }
  throw new Error("TinyFish stream ended without COMPLETE event");
}
