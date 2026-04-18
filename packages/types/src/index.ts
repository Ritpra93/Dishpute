export type Platform = "doordash" | "ubereats" | "grubhub";

export type ErrorChargeType =
  | "missing_item"
  | "wrong_item"
  | "order_never_arrived"
  | "cold_food"
  | "customer_cancel"
  | "unknown";

/**
 * Raw charge scraped from the merchant portal BEFORE classification.
 * Owned by: packages/scraper
 * Consumed by: packages/classifier, apps/web
 */
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

/**
 * Classifier output: merit score + drafted dispute.
 * Owned by: packages/classifier
 * Consumed by: apps/web (display), packages/scraper (submit)
 */
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

/**
 * Result of actually submitting to the portal.
 * Owned by: packages/scraper
 * Consumed by: apps/web, apps/voice (for escalation triggers)
 */
export interface SubmissionResult {
  candidateId: string;
  submittedAt: string;
  status: "submitted" | "platform_rejected_at_submit" | "error";
  platformConfirmationId?: string;
  errorMessage?: string;
}

/**
 * After the platform adjudicates (or we scrape back the status).
 * Triggers voice escalation if denied.
 */
export interface DisputeOutcome {
  candidateId: string;
  outcome: "approved" | "denied" | "pending";
  refundedCents: number;
  adjudicatedAt?: string;
  escalateToVoice: boolean;
}

/**
 * Voice escalation record. Owned by apps/voice.
 */
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

export * from "./constants.js";
export * from "./fixtures.js";
