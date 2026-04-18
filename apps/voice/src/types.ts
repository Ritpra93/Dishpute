// Local shim — replace with `from "@counter/types"` once that package is built.

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
