// TODO: replace with import from @counter/types once the shared package is built.
// Shape mirrors docs/INTERFACES.md VoiceCallRecord exactly.
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

export type ErrorChargeType =
  | "missing_item"
  | "wrong_item"
  | "order_never_arrived"
  | "cold_food"
  | "customer_cancel"
  | "unknown";

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

export interface DisputeOutcome {
  candidateId: string;
  outcome: "approved" | "denied" | "pending";
  refundedCents: number;
  adjudicatedAt?: string;
  escalateToVoice: boolean;
}

export interface OutboundCallRequest {
  candidateId: string;
  phoneNumber: string;
  context: ClassifiedDispute & { outcome: DisputeOutcome };
}
