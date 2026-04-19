// Pass-through: mock classifier is now @counter/classifier.
// See packages/classifier/src/mock.ts for the 30-entry SEEDS table
// (with the $892 runtime guardrail).
export { createMockClassifier, createClassifier } from "@counter/classifier";
