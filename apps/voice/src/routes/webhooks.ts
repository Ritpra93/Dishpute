import { Router, raw } from "express";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { upsertVoiceCall, getCandidateWithClassification, markAudioStored } from "../db";
import { config } from "../config";
import {
  fetchConversationDetail,
  fetchConversationAudio,
  AudioNotYetAvailableError,
} from "../elevenlabs";
import { saveAudio } from "../audio-storage";

const router = Router();
const client = new ElevenLabsClient({ apiKey: config.elevenLabsApiKey });

// ---------------------------------------------------------------------------
// Background audio fetcher — fire-and-forget after post-call webhook.
// Polls conversation detail for has_audio === true, then downloads the MP3.
// Never blocks the webhook response.
// ---------------------------------------------------------------------------
async function fetchAndStoreAudio(conversationId: string) {
  const maxAttempts = 5;
  const baseDelayMs = 3000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Gate on has_audio from the detail endpoint per VERIFIED_APIS.md
      const detail = await fetchConversationDetail(conversationId);
      if (!detail.has_audio) {
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
          continue;
        }
        console.warn(
          `[audio] ${conversationId} has_audio still false after ${maxAttempts} attempts`
        );
        return;
      }

      const bytes = await fetchConversationAudio(conversationId);
      const { path } = await saveAudio(conversationId, bytes);
      markAudioStored({ conversationId, audioPath: path });
      console.log(
        `[audio] stored ${conversationId} (${bytes.length}b) attempt=${attempt}`
      );
      return;
    } catch (err) {
      if (err instanceof AudioNotYetAvailableError && attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      console.error(
        `[audio] failed ${conversationId} attempt=${attempt}:`,
        err
      );
      return;
    }
  }
}

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

        // When the agent recovers the charge on-call, roll the classification's
        // recoverable_cents into voice_calls so computeStats() can sum it into
        // totalRealizedCents. Previously this wrote NULL — the "Realized" tile
        // never ticked up from voice recoveries.
        let recoveredCents = 0;
        if (callOutcome === "recovered") {
          const row = getCandidateWithClassification(candidateId);
          recoveredCents = row?.recoverable_cents ?? 0;
        }

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
          recoveredCents,
        });

        console.log(
          `[webhook] post_call_transcription — conversation=${conversation_id} candidate=${candidateId} outcome=${callOutcome}`
        );

        // Fire-and-forget: fetch + store audio in the background.
        // The leading `void` silences no-floating-promises and signals intent.
        void fetchAndStoreAudio(conversation_id);
      }

      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("[webhook] Error processing post-call webhook:", err);
      res.status(200).json({ status: "logged-as-error" });
    }
  }
);

export default router;
