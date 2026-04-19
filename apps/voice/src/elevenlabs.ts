// Verified against docs/VERIFIED_APIS.md — ElevenLabs section.
// Endpoint: POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
// Auth: xi-api-key header (NOT Authorization: Bearer)
// Response: { success, conversation_id, callSid } — note callSid is camelCase
//
// GET /v1/convai/conversations/:id — conversation detail + live transcript
// GET /v1/convai/conversations/:id/audio — binary MP3 download
// Source: https://elevenlabs.io/docs/api-reference/conversations/get-conversation-details
// Source: https://elevenlabs.io/docs/api-reference/conversations/get-conversation-audio

import { config } from "./config";

export interface OutboundCallResult {
  success: boolean;
  conversation_id: string;
  callSid: string;
}

export async function initiateOutboundCall(opts: {
  toNumber: string;
  dynamicVariables: {
    case_number: string;
    merchant_name: string;
    denial_reason: string;
    case_id: string;
  };
}): Promise<OutboundCallResult> {
  const res = await fetch(
    "https://api.elevenlabs.io/v1/convai/twilio/outbound-call",
    {
      method: "POST",
      headers: {
        "xi-api-key": config.elevenLabsApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_id: config.elevenLabsAgentId,
        agent_phone_number_id: config.elevenLabsPhoneNumberId,
        to_number: opts.toNumber,
        conversation_initiation_client_data: {
          dynamic_variables: opts.dynamicVariables,
        },
        call_recording_enabled: true,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `ElevenLabs outbound-call ${res.status}: ${await res.text()}`
    );
  }

  return res.json() as Promise<OutboundCallResult>;
}


// ---------------------------------------------------------------------------
// Audio + conversation detail — plain fetch, no SDK (binary audio is awkward
// through the SDK and these are trivial GET requests).
// ---------------------------------------------------------------------------

export class AudioNotYetAvailableError extends Error {
  constructor(conversationId: string) {
    super(`Audio not yet available for conversation ${conversationId}`);
    this.name = "AudioNotYetAvailableError";
  }
}

export interface ConversationDetail {
  conversation_id: string;
  status: "initiated" | "in-progress" | "processing" | "done" | "failed";
  has_audio?: boolean;
  has_user_audio?: boolean;
  has_response_audio?: boolean;
  transcript: Array<{
    role: "agent" | "user" | "tool";
    message: string;
    time_in_call_secs: number;
    tool_calls?: unknown[];
    tool_results?: unknown[];
  }>;
  metadata?: { call_duration_secs?: number; termination_reason?: string };
  analysis?: { call_successful?: string; transcript_summary?: string };
}

/**
 * GET /v1/convai/conversations/:id
 * Returns the current state of a conversation including transcript turns.
 */
export async function fetchConversationDetail(
  conversationId: string
): Promise<ConversationDetail> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
    { headers: { "xi-api-key": config.elevenLabsApiKey } }
  );

  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    throw new Error(
      `fetchConversationDetail ${res.status}: ${body}`
    );
  }

  const json = (await res.json()) as Record<string, unknown>;
  return {
    conversation_id: (json.conversation_id as string) ?? conversationId,
    status: (json.status as ConversationDetail["status"]) ?? "failed",
    has_audio: (json.has_audio as boolean) ?? false,
    has_user_audio: (json.has_user_audio as boolean) ?? false,
    has_response_audio: (json.has_response_audio as boolean) ?? false,
    transcript: Array.isArray(json.transcript) ? json.transcript : [],
    metadata: json.metadata as ConversationDetail["metadata"],
    analysis: json.analysis as ConversationDetail["analysis"],
  } satisfies ConversationDetail;
}

/**
 * GET /v1/convai/conversations/:id/audio
 * Downloads the full MP3 recording. Gate calls on has_audio === true from
 * fetchConversationDetail to avoid hitting undocumented error states.
 */
export async function fetchConversationAudio(
  conversationId: string
): Promise<Uint8Array> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
    { headers: { "xi-api-key": config.elevenLabsApiKey } }
  );

  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    if (res.status === 404 || res.status === 422) {
      throw new AudioNotYetAvailableError(conversationId);
    }
    throw new Error(`fetchConversationAudio ${res.status}: ${body}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}
