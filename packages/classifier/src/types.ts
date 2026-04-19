/**
 * Internal types for the multi-agent DAG.
 * These flow between agents inside the classifier package — they are NOT
 * shared via @counter/types.
 */

/** Output of the Classifier (triage) Agent — Haiku 4.5 */
export interface TriageResult {
  shouldDispute: boolean;
  meritScore: number;
  resolvedChargeType: string;
  quickReasoning: string;
}

/** A single annotated citation from the Evidence Agent */
export interface AnnotatedCitation {
  fact: string;
  source: string;
  strength: 'strong' | 'moderate' | 'weak';
}

/** Output of the Evidence Agent — Haiku 4.5 */
export interface EvidencePack {
  evidencePack: string;
  citations: AnnotatedCitation[];
  customerRiskSignals: string[];
}
