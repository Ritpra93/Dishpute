/**
 * S1 — Parallel multi-platform submission via TinyFish batch endpoint.
 *
 * Verified against docs/VERIFIED_APIS.md:
 *   POST https://agent.tinyfish.ai/v1/automation/run-batch
 *   Auth: X-API-Key (NOT Authorization: Bearer)
 *   Body: { runs: [...], output_schema?: {...} }
 *   200 → { run_ids: string[], error: null }
 */

import type { DisputeCandidate, SubmissionResult } from "@counter/types";

const TINYFISH_BATCH_URL = "https://agent.tinyfish.ai/v1/automation/run-batch";

export interface BatchRunSpec {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: { enabled: boolean; type?: string; country_code: string };
  agent_config?: { mode?: "default" | "strict"; max_steps?: number };
  capture_config?: {
    elements?: boolean;
    snapshots?: boolean;
    screenshots?: boolean;
    recording?: boolean;
  };
  webhook_url?: string;
  use_vault?: boolean;
  credential_item_ids?: string[];
}

export interface BatchResult {
  runIds: string[];
  error: string | null;
}

/**
 * Fire a batch of TinyFish runs atomically. Returns run IDs on success.
 * All-or-nothing: if any run spec is invalid, none are created.
 */
export async function runTinyFishBatch(
  runs: BatchRunSpec[],
  outputSchema?: Record<string, unknown>,
): Promise<BatchResult> {
  const apiKey = process.env["TINYFISH_API_KEY"];

  if (!apiKey) {
    throw new Error("TINYFISH_API_KEY not set — cannot run batch");
  }

  const body: Record<string, unknown> = { runs };
  if (outputSchema) {
    body["output_schema"] = outputSchema;
  }

  const res = await fetch(TINYFISH_BATCH_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TinyFish batch ${res.status}: ${text}`);
  }

  const data = (await res.json()) as { run_ids?: string[]; error?: { code?: string; message?: string } | null };

  if (data.error) {
    throw new Error(`TinyFish batch error: ${data.error.code} — ${data.error.message}`);
  }

  return {
    runIds: data.run_ids ?? [],
    error: null,
  };
}

/**
 * Submit multiple disputes in parallel via a single batch call.
 * Each dispute gets its own TinyFish run with a submit-specific goal.
 */
export async function submitDisputeBatch(
  items: Array<{ candidate: DisputeCandidate; draftedText: string }>,
): Promise<SubmissionResult[]> {
  if (items.length === 0) return [];

  const runs: BatchRunSpec[] = items.map(({ candidate, draftedText }) => ({
    url: candidate.portalUrl,
    goal: `
Navigate to ${candidate.portalUrl}.
Find the "Dispute charge" button and click it.
In the resulting form, find the textarea or input labelled "Your response" and paste exactly this text (do not modify it):
---
${draftedText}
---
Click the "Submit dispute" button and wait for the confirmation screen to appear.
Extract the confirmation ID (format: CONF-XXXXXX) from the confirmation screen.
Return ONLY a JSON object: { "confirmationId": string }
`.trim(),
    browser_profile: "lite" as const,
    capture_config: { screenshots: true, elements: true },
  }));

  const { runIds } = await runTinyFishBatch(runs);

  // Map run IDs back to submission results. The actual confirmation IDs
  // come from polling each run's result — for now we return pending results
  // keyed by run ID. The caller can poll via GET /v1/runs/{id} later.
  return items.map(({ candidate }, i) => ({
    candidateId: candidate.id,
    submittedAt: new Date().toISOString(),
    status: "submitted" as const,
    platformConfirmationId: runIds[i] ? `BATCH-${runIds[i]}` : undefined,
    errorMessage: runIds[i] ? undefined : "No run ID returned for this item",
  }));
}
