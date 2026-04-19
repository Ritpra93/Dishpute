// Verified against docs/VERIFIED_APIS.md — ElevenLabs section.
// Endpoint: POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
// Auth: xi-api-key header (NOT Authorization: Bearer)
// Response: { success, conversation_id, callSid } — note callSid is camelCase

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
