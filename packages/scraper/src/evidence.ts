/**
 * S4 — Evidence bundle builder.
 *
 * Builds EvidenceBundle objects (per @counter/types) from TinyFish run
 * artifacts. Uses capture_config screenshots + DOM elements to assemble
 * the bundle W3's PDF renderer expects.
 *
 * In fixture mode, returns a deterministic mock bundle.
 */

import type {
  EvidenceBundle,
  EvidenceArtifact,
  EvidenceArtifactKind,
} from "@counter/types";

const TINYFISH_BASE = "https://agent.tinyfish.ai/v1";

/** Raw step shape from GET /v1/runs/{id}?screenshots=base64 */
interface TinyFishRunStep {
  id: string;
  timestamp: string;
  status: string;
  action: string | null;
  screenshot?: string; // base64 JPEG when ?screenshots=base64
  duration?: number;
}

interface TinyFishRunResponse {
  status: string;
  goal: string;
  created_at: string;
  started_at: string;
  finished_at: string;
  num_of_steps: number;
  result: unknown;
  error?: { category?: string; message?: string };
  video_url?: string; // presigned, 15-min expiry
  steps: TinyFishRunStep[];
}

export interface BuildEvidenceOpts {
  runId: string;
  candidateId: string;
  caseNumber: string;
  merchantName: string;
  recoverableCents: number;
  /** Optional classifier reasoning to include as a claude_annotation artifact. */
  classifierReasoning?: string;
  /** Optional evidence citations from the classifier. */
  evidenceCitations?: string[];
}

/**
 * Fetch a TinyFish run's artifacts and assemble an EvidenceBundle.
 */
export async function buildEvidenceBundle(
  opts: BuildEvidenceOpts,
): Promise<EvidenceBundle> {
  const apiKey = process.env["TINYFISH_API_KEY"];

  if (!apiKey || process.env["SCRAPER_MODE"] === "cache") {
    return buildMockEvidenceBundle(opts);
  }

  const res = await fetch(
    `${TINYFISH_BASE}/runs/${opts.runId}?screenshots=base64`,
    {
      headers: { "X-API-Key": apiKey },
    },
  );

  if (!res.ok) {
    // Fall back to mock if the run isn't found or API errors.
    return buildMockEvidenceBundle(opts);
  }

  const run = (await res.json()) as TinyFishRunResponse;
  const artifacts: EvidenceArtifact[] = [];

  // Screenshots from each step.
  for (const step of run.steps) {
    if (step.screenshot) {
      artifacts.push({
        candidateId: opts.candidateId,
        kind: "screenshot",
        title: `Step ${step.id} — ${step.action ?? "browser action"}`,
        capturedAt: step.timestamp,
        source: opts.runId,
        imageDataUrl: `data:image/jpeg;base64,${step.screenshot}`,
      });
    }
  }

  // Video clip if available.
  if (run.video_url) {
    artifacts.push({
      candidateId: opts.candidateId,
      kind: "video_clip",
      title: "Full browser recording",
      capturedAt: run.finished_at ?? run.started_at,
      videoUrl: run.video_url,
      claudeAnnotation: "Presigned URL — expires 15 minutes after generation. Re-fetch if needed.",
    });
  }

  // Classifier reasoning as annotation.
  if (opts.classifierReasoning) {
    artifacts.push({
      candidateId: opts.candidateId,
      kind: "claude_annotation",
      title: "Classifier reasoning",
      capturedAt: new Date().toISOString(),
      text: opts.classifierReasoning,
    });
  }

  // Evidence citations as individual artifacts.
  if (opts.evidenceCitations) {
    for (const citation of opts.evidenceCitations) {
      artifacts.push({
        candidateId: opts.candidateId,
        kind: "receipt_text",
        title: "Evidence citation",
        capturedAt: new Date().toISOString(),
        text: citation,
      });
    }
  }

  return {
    candidateId: opts.candidateId,
    caseNumber: opts.caseNumber,
    merchantName: opts.merchantName,
    generatedAt: new Date().toISOString(),
    totalRecoverableCents: opts.recoverableCents,
    summary: `Evidence bundle for case ${opts.caseNumber}: ${artifacts.length} artifacts captured across ${run.num_of_steps} browser steps.`,
    artifacts,
  };
}

// 1x1 transparent PNG for fixture screenshots.
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==";

/**
 * Deterministic mock evidence bundle for fixture/demo mode.
 */
export function buildMockEvidenceBundle(
  opts: BuildEvidenceOpts,
): EvidenceBundle {
  const now = new Date().toISOString();
  const artifacts: EvidenceArtifact[] = [
    {
      candidateId: opts.candidateId,
      kind: "screenshot",
      title: "Step 1 — Navigate to merchant portal",
      capturedAt: now,
      source: opts.runId,
      imageDataUrl: PIXEL,
    },
    {
      candidateId: opts.candidateId,
      kind: "screenshot",
      title: "Step 2 — Open dispute form",
      capturedAt: now,
      source: opts.runId,
      imageDataUrl: PIXEL,
    },
    {
      candidateId: opts.candidateId,
      kind: "dom_element",
      title: "Dispute form — response field",
      capturedAt: now,
      text: '<textarea name="response" class="dispute-response">Counter-drafted dispute text was pasted here.</textarea>',
    },
    {
      candidateId: opts.candidateId,
      kind: "screenshot",
      title: "Step 3 — Submit confirmation",
      capturedAt: now,
      source: opts.runId,
      imageDataUrl: PIXEL,
    },
  ];

  if (opts.classifierReasoning) {
    artifacts.push({
      candidateId: opts.candidateId,
      kind: "claude_annotation",
      title: "Classifier reasoning",
      capturedAt: now,
      text: opts.classifierReasoning,
    });
  }

  if (opts.evidenceCitations) {
    for (const citation of opts.evidenceCitations) {
      artifacts.push({
        candidateId: opts.candidateId,
        kind: "receipt_text",
        title: "Evidence citation",
        capturedAt: now,
        text: citation,
      });
    }
  }

  return {
    candidateId: opts.candidateId,
    caseNumber: opts.caseNumber,
    merchantName: opts.merchantName,
    generatedAt: now,
    totalRecoverableCents: opts.recoverableCents,
    summary: `Evidence bundle for case ${opts.caseNumber}: ${artifacts.length} artifacts captured (fixture mode).`,
    artifacts,
  };
}
