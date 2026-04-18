import type { DisputeCandidate, ClassifiedDispute } from '@counter/types';
import { buildMockClassification } from './mock';

export interface Classifier {
  classify(candidate: DisputeCandidate): Promise<ClassifiedDispute>;
  classifyMany(candidates: DisputeCandidate[]): Promise<ClassifiedDispute[]>;
}

export function createMockClassifier(): Classifier {
  return {
    async classify(candidate) {
      return buildMockClassification(candidate);
    },
    async classifyMany(candidates) {
      return Promise.all(candidates.map((c) => buildMockClassification(c)));
    },
  };
}

export function createClassifier(_opts: { anthropicApiKey: string }): Classifier {
  throw new Error('createClassifier not implemented yet — use createMockClassifier() for now (Task 4)');
}
