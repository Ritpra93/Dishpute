/**
 * INLINED COPY OF @counter/types
 *
 * MERGE NOTE: Replace the entire body of this file with:
 *   export * from "@counter/types";
 * once Worker 0/1 ships the workspace package. Verify the shapes below match
 * docs/INTERFACES.md byte-for-byte first (they were copied verbatim).
 */

export type Platform = "doordash" | "ubereats" | "grubhub";

export type ErrorChargeType =
  | "missing_item"
  | "wrong_item"
  | "order_never_arrived"
  | "cold_food"
  | "customer_cancel"
  | "unknown";

export interface DisputeCandidate {
  id: string;
  platform: Platform;
  orderId: string;
  chargeType: ErrorChargeType;
  chargeAmountCents: number;
  itemsReported: Array<{
    name: string;
    quantity: number;
    refundAmountCents: number;
  }>;
  customerComment?: string;
  orderTimestamp: string;
  chargeTimestamp: string;
  disputeDeadline: string;
  portalUrl: string;
  rawText: string;
}

export interface ClassifiedDispute {
  candidateId: string;
  shouldDispute: boolean;
  meritScore: number;
  reasoning: string;
  resolvedChargeType: ErrorChargeType;
  recoverableCents: number;
  draftedDisputeText: string;
  evidenceCitations: string[];
  generatedAt: string;
}

export interface SubmissionResult {
  candidateId: string;
  submittedAt: string;
  status: "submitted" | "platform_rejected_at_submit" | "error";
  platformConfirmationId?: string;
  errorMessage?: string;
}

export interface DisputeOutcome {
  candidateId: string;
  outcome: "approved" | "denied" | "pending";
  refundedCents: number;
  adjudicatedAt?: string;
  escalateToVoice: boolean;
}

export interface VoiceCallRecord {
  candidateId: string;
  elevenLabsConversationId: string;
  twilioCallSid: string;
  startedAt: string;
  endedAt?: string;
  transcript?: Array<{
    role: "agent" | "user";
    message: string;
    timeInCallSecs: number;
  }>;
  callOutcome?: "recovered" | "still_denied" | "callback_requested";
  recoveredCents?: number;
}

export interface EnrichedDispute extends DisputeCandidate {
  classification?: ClassifiedDispute;
  submission?: SubmissionResult;
  outcome?: DisputeOutcome;
}

/**
 * Public API of @counter/scraper. Consumed by apps/web API routes.
 * MERGE NOTE: replace with `import type { Scraper } from "@counter/scraper"`.
 */
export interface Scraper {
  listOpenDisputes(opts: {
    merchantId: string;
    platform: "doordash";
  }): Promise<DisputeCandidate[]>;
  submitDispute(opts: {
    candidate: DisputeCandidate;
    draftedText: string;
  }): Promise<SubmissionResult>;
  scrapeOutcomes(opts: {
    candidateIds: string[];
  }): Promise<
    Array<{
      candidateId: string;
      outcome: "approved" | "denied" | "pending";
      refundedCents: number;
    }>
  >;
}

/**
 * Public API of @counter/classifier. Consumed by apps/web API routes.
 * MERGE NOTE: replace with `import type { Classifier } from "@counter/classifier"`.
 */
export interface Classifier {
  classify(candidate: DisputeCandidate): Promise<ClassifiedDispute>;
  classifyMany(candidates: DisputeCandidate[]): Promise<ClassifiedDispute[]>;
}

export interface DashboardStats {
  totalCharges: number;
  totalDisputed: number;
  /** Sum of recoverable across every submitted dispute (regardless of outcome). The demo headline. */
  totalSubmittedRecoverableCents: number;
  /** Realized money: approved refunds + voice-escalation recoveries. */
  totalRealizedCents: number;
  /** Submitted, outcome = pending. */
  totalInFlightCents: number;
  /** Submitted, outcome = denied. Escalation candidates. */
  totalDeniedCents: number;
  /** Counter's contingency cut on realized money. */
  counterFeeCents: number;
}

export const DISPUTE_WINDOW_DAYS = 14;

export const MERIT_THRESHOLDS = {
  AUTO_SUBMIT: 70,
  HUMAN_REVIEW: 40,
  SKIP: 0,
} as const;

export const CONTINGENCY_FEE_RATE = 0.2;
export const VOICE_ESCALATION_MIN_MERIT = 70;
export const SUBMIT_CONCURRENCY = 5;
export const CLASSIFIER_CONCURRENCY = 10;

export const DEMO_MERCHANT = {
  id: "merchant_hoc",
  name: "House of Curry",
  locations: 3,
  city: "Minneapolis",
} as const;
