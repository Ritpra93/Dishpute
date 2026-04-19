import type { DisputeCandidate, ClassifiedDispute } from '@counter/types';
import { CLASSIFIER_CONCURRENCY, VOICE_ESCALATION_MIN_MERIT } from '@counter/types';
import { buildMockClassification } from './mock';
import {
  initClient,
  prefilterWithHaiku,
  classifyWithSonnet,
  triageWithHaiku,
  assembleEvidenceWithHaiku,
  draftWithSonnet,
  negotiateWithHaiku,
} from './claude';

export interface Classifier {
  classify(candidate: DisputeCandidate): Promise<ClassifiedDispute>;
  classifyMany(candidates: DisputeCandidate[]): Promise<ClassifiedDispute[]>;
}

// ─── concurrency helper ───────────────────────────────────────────────────────

async function runConcurrent(
  items: DisputeCandidate[],
  limit: number,
  fn: (item: DisputeCandidate) => Promise<ClassifiedDispute>,
): Promise<ClassifiedDispute[]> {
  const results: ClassifiedDispute[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const idx = nextIndex++;
      results[idx] = await fn(items[idx]);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

// ─── skipped classification (triage said not worth disputing) ─────────────────

function buildSkippedClassification(
  candidate: DisputeCandidate,
  reason: string,
): ClassifiedDispute {
  return {
    candidateId: candidate.id,
    shouldDispute: false,
    meritScore: 0,
    reasoning: reason,
    resolvedChargeType: candidate.chargeType,
    recoverableCents: 0,
    draftedDisputeText: '',
    evidenceCitations: [reason],
    generatedAt: new Date().toISOString(),
  };
}

// ─── factories ────────────────────────────────────────────────────────────────

export interface MockClassifierOptions {
  /** Optional artificial latency per call to mimic Claude. Defaults to 0. */
  latencyMs?: number;
}

export function createMockClassifier(opts: MockClassifierOptions = {}): Classifier {
  const sleep = (ms: number) =>
    ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve();
  const latency = opts.latencyMs ?? 0;

  return {
    async classify(candidate) {
      await sleep(latency);
      return buildMockClassification(candidate);
    },
    async classifyMany(candidates) {
      await sleep(latency);
      return candidates.map((c) => buildMockClassification(c));
    },
  };
}

/**
 * Legacy classifier — 2-step pipeline (Haiku prefilter → Sonnet classify).
 * Kept for backward compatibility. Use createDagClassifier() for the full
 * 4-agent DAG.
 */
export function createClassifier({ anthropicApiKey }: { anthropicApiKey: string }): Classifier {
  initClient(anthropicApiKey);

  async function classify(candidate: DisputeCandidate): Promise<ClassifiedDispute> {
    const prefilter = await prefilterWithHaiku(candidate);

    if (!prefilter.worthDisputing) {
      return buildSkippedClassification(candidate, prefilter.quickReason);
    }

    const raw = await classifyWithSonnet(candidate);
    return {
      ...raw,
      candidateId: candidate.id,
      generatedAt: new Date().toISOString(),
    };
  }

  return {
    classify,
    async classifyMany(candidates) {
      return runConcurrent(candidates, CLASSIFIER_CONCURRENCY, classify);
    },
  };
}

/**
 * 4-agent DAG classifier:
 *   ① Classifier (Haiku) → ② Evidence (Haiku) → ③ Submitter (Sonnet) → ④ Negotiator (Haiku)
 *
 * The Negotiator only runs for candidates with meritScore >= VOICE_ESCALATION_MIN_MERIT.
 * Its output is attached as `negotiatorOutput` on the ClassifiedDispute.
 */
export function createDagClassifier({ anthropicApiKey }: { anthropicApiKey: string }): Classifier {
  initClient(anthropicApiKey);

  async function classify(candidate: DisputeCandidate): Promise<ClassifiedDispute> {
    // ① Triage — Haiku fast-path
    const triage = await triageWithHaiku(candidate);

    if (!triage.shouldDispute) {
      return buildSkippedClassification(candidate, triage.quickReasoning);
    }

    // ② Evidence assembly — Haiku
    const evidence = await assembleEvidenceWithHaiku(candidate, triage);

    // ③ Draft — Sonnet (the expensive, high-quality call)
    const draft = await draftWithSonnet(candidate, triage, evidence);

    const result: ClassifiedDispute = {
      ...draft,
      candidateId: candidate.id,
      generatedAt: new Date().toISOString(),
    };

    // ④ Negotiator — Haiku (only for escalation-eligible disputes)
    if (result.meritScore >= VOICE_ESCALATION_MIN_MERIT) {
      result.negotiatorOutput = await negotiateWithHaiku(candidate, draft);
    }

    return result;
  }

  return {
    classify,
    async classifyMany(candidates) {
      return runConcurrent(candidates, CLASSIFIER_CONCURRENCY, classify);
    },
  };
}
