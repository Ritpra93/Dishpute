const NGROK_PUBLIC_URL = process.env["NGROK_PUBLIC_URL"];

if (!NGROK_PUBLIC_URL) {
  console.warn(
    "[config] NGROK_PUBLIC_URL is not set. " +
      "Run `ngrok http 4000`, copy the forwarding URL, and add it to .env.local. " +
      "ElevenLabs tool webhooks will not work without it."
  );
}

export const config = {
  port: Number(process.env["PORT"] ?? 4000),
  ngrokPublicUrl: NGROK_PUBLIC_URL ?? "",
  elevenLabsApiKey: process.env["ELEVENLABS_API_KEY"] ?? "",
  elevenLabsAgentId: process.env["ELEVENLABS_AGENT_ID"] ?? "",
  elevenLabsPhoneNumberId: process.env["ELEVENLABS_PHONE_NUMBER_ID"] ?? "",
  elevenLabsWebhookSecret: process.env["ELEVENLABS_WEBHOOK_SECRET"] ?? "",
} as const;

export const TOOL_URLS = {
  lookupCase: `${config.ngrokPublicUrl}/tools/lookup_case`,
  referenceEvidence: `${config.ngrokPublicUrl}/tools/reference_evidence`,
  escalateToSupervisor: `${config.ngrokPublicUrl}/tools/escalate_to_supervisor`,
} as const;
