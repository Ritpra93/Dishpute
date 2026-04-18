import { Router, raw } from "express";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { upsertVoiceCall } from "../db";
import { config } from "../config";

const router = Router();
const client = new ElevenLabsClient({ apiKey: config.elevenLabsApiKey });

function parseCallOutcome(
  analysis: { call_successful?: string } | undefined
): "recovered" | "still_denied" | "callback_requested" | undefined {
  if (!analysis) return undefined;
  if (analysis.call_successful === "success") return "recovered";
  if (analysis.call_successful === "failure") return "still_denied";
  return "callback_requested";
}

// CRITICAL: use raw body parser on this route — signature verification needs
// the exact bytes. Never swap this to express.json().
router.post(
  "/webhooks/elevenlabs/post-call",
  raw({ type: "application/json" }),
  async (req, res) => {
    // Always return 200 — ElevenLabs does not retry 4xx responses.
    try {
      const sig = req.header("ElevenLabs-Signature");
      if (!sig) {
        console.warn("[webhook] Missing ElevenLabs-Signature header");
        res.status(200).json({ status: "missing-signature" });
        return;
      }

      // constructEvent is async — verifies HMAC via Web Crypto, returns the
      // parsed event. Missing `await` here silently breaks the webhook:
      // `event` becomes a Promise, every `event.type === ...` check is false,
      // and no transcript lands.
      const event = await client.webhooks.constructEvent(
        req.body.toString("utf-8"),
        sig,
        config.elevenLabsWebhookSecret
      );

      if (event.type === "post_call_transcription") {
        const {
          conversation_id,
          transcript,
          analysis,
          conversation_initiation_client_data,
        } = event.data as {
          conversation_id: string;
          transcript?: Array<{ role: string; message: string; time_in_call_secs: number }>;
          analysis?: { call_successful?: string; transcript_summary?: string };
          conversation_initiation_client_data?: {
            dynamic_variables?: Record<string, string>;
          };
        };

        const dynamicVars =
          conversation_initiation_client_data?.dynamic_variables ?? {};
        const candidateId = dynamicVars["case_id"] ?? "unknown";
        const callOutcome = parseCallOutcome(analysis);

        const transcriptNormalised = transcript?.map((t) => ({
          role: t.role as "agent" | "user",
          message: t.message,
          timeInCallSecs: t.time_in_call_secs,
        }));

        upsertVoiceCall({
          candidateId,
          elevenLabsConversationId: conversation_id,
          twilioCallSid: dynamicVars["twilio_call_sid"] ?? "",
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          transcriptJson: transcriptNormalised
            ? JSON.stringify(transcriptNormalised)
            : undefined,
          callOutcome,
          recoveredCents: callOutcome === "recovered" ? undefined : 0,
        });

        console.log(
          `[webhook] post_call_transcription — conversation=${conversation_id} candidate=${candidateId} outcome=${callOutcome}`
        );
      }

      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("[webhook] Error processing post-call webhook:", err);
      res.status(200).json({ status: "logged-as-error" });
    }
  }
);

export default router;
