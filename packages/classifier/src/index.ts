import type { DisputeCandidate, ClassifiedDispute } from '@counter/types';
import { CLASSIFIER_CONCURRENCY } from '@counter/types';
import { buildMockClassification } from './mock';
import { initClient, prefilterWithHaiku, classifyWithSonnet } from './claude';

export interface Classifier {
  classify(candidate: DisputeCandidate): Promise<ClassifiedDispute>;
  classifyMany(candidates: DisputeCandidate[]): Promise<ClassifiedDispute[]>;
}

// ─── concurrency helper ───────────────────────────────────────────────────────

// Runs fn over items with at most `limit` concurrent calls. Preserves order.
// CLASSIFIER_CONCURRENCY = 10 — change that constant (in @counter/types) to tune.
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

// ─── skipped classification (Haiku said not worth disputing) ──────────────────

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
