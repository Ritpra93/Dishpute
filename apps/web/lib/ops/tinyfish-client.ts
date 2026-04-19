/**
 * Dual-mode TinyFish dispatcher used by the W4 ops API routes.
 *
 * If `TINYFISH_API_KEY` is set, posts a run-batch with one task per platform
 * (matching the verified spec at docs/VERIFIED_APIS.md). Otherwise, returns a
 * deterministic fixture response so the demo still works without credentials.
 */

import "server-only";

export type OpsPlatform = "doordash" | "ubereats" | "grubhub";

export interface OpsTask {
  platform: OpsPlatform;
  /** Free-form goal text Worker 1 will turn into a TinyFish goal. */
  goal: string;
  /** Structured payload echoed back to the UI for confirmation. */
  payload: Record<string, unknown>;
}

export interface OpsRunResult {
  mode: "live" | "fixture";
  batchId: string;
  startedAt: string;
  runs: Array<{
    runId: string;
    platform: OpsPlatform;
    status: "PENDING" | "RUNNING" | "COMPLETED";
  }>;
}

const TINYFISH_BASE =
  process.env["TINYFISH_BASE_URL"] ?? "https://api.tinyfish.ai/v1";

export async function dispatchOpsBatch(
  tasks: OpsTask[]
): Promise<OpsRunResult> {
  const apiKey = process.env["TINYFISH_API_KEY"];
  const startedAt = new Date().toISOString();

  if (!apiKey) {
    return {
      mode: "fixture",
      batchId: `batch_fixture_${Date.now()}`,
      startedAt,
      runs: tasks.map((t, i) => ({
        runId: `run_fixture_${Date.now()}_${i}`,
        platform: t.platform,
        status: "COMPLETED",
      })),
    };
  }

  const res = await fetch(`${TINYFISH_BASE}/automation/run-batch`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      tasks: tasks.map((t) => ({
        goal: t.goal,
        metadata: { platform: t.platform, ...t.payload },
      })),
    }),
  });

  if (!res.ok) {
    throw new Error(
      `TinyFish run-batch failed: ${res.status} ${await res.text().catch(() => "")}`
    );
  }

  const data = (await res.json()) as {
    batchId?: string;
    runs?: Array<{ runId: string; metadata?: { platform?: OpsPlatform }; status?: string }>;
  };

  return {
    mode: "live",
    batchId: data.batchId ?? `batch_${Date.now()}`,
    startedAt,
    runs:
      data.runs?.map((r, i) => ({
        runId: r.runId,
        platform: r.metadata?.platform ?? tasks[i]?.platform ?? "doordash",
        status: (r.status as "PENDING" | "RUNNING" | "COMPLETED") ?? "PENDING",
      })) ?? [],
  };
}
