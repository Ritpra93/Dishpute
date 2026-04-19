const NGROK_PUBLIC_URL = process.env["NGROK_PUBLIC_URL"];

if (!NGROK_PUBLIC_URL) {
  console.warn(
    "[config] NGROK_PUBLIC_URL is not set. " +
      "Run `ngrok http 4000`, copy the forwarding URL, and add it to .env.local. " +
      "ElevenLabs tool webhooks will not work without it."
  );
}

// Validate required keys for outbound calls and log actionable errors at startup.
const REQUIRED_FOR_CALLS: Array<[string, string]> = [
  ["ELEVENLABS_API_KEY",        "ElevenLabs API key (from platform.elevenlabs.io → API keys)"],
  ["ELEVENLABS_AGENT_ID",       "ElevenLabs Conversational AI agent ID"],
  ["ELEVENLABS_PHONE_NUMBER_ID","ElevenLabs phone number ID linked to a Twilio number"],
];
for (const [key, description] of REQUIRED_FOR_CALLS) {
  if (!process.env[key]) {
    console.warn(`[config] ${key} is not set — ${description}. Outbound calls will fail.`);
  }
}

export const config = {
  port: Number(process.env["PORT"] ?? 4000),
  ngrokPublicUrl: NGROK_PUBLIC_URL ?? "",
  elevenLabsApiKey: process.env["ELEVENLABS_API_KEY"] ?? "",
  elevenLabsAgentId: process.env["ELEVENLABS_AGENT_ID"] ?? "",
  elevenLabsPhoneNumberId: process.env["ELEVENLABS_PHONE_NUMBER_ID"] ?? "",
  elevenLabsWebhookSecret: process.env["ELEVENLABS_WEBHOOK_SECRET"] ?? "",
} as const;

/** True only when all three keys required for an outbound call are present. */
export function canMakeOutboundCalls(): boolean {
  return !!(config.elevenLabsApiKey && config.elevenLabsAgentId && config.elevenLabsPhoneNumberId);
}

export const TOOL_URLS = {
  lookupCase: `${config.ngrokPublicUrl}/tools/lookup_case`,
  referenceEvidence: `${config.ngrokPublicUrl}/tools/reference_evidence`,
  escalateToSupervisor: `${config.ngrokPublicUrl}/tools/escalate_to_supervisor`,
} as const;
