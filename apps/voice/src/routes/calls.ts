import { Router } from "express";
import { z } from "zod";
import { initiateOutboundCall, fetchConversationDetail } from "../elevenlabs";
import { canMakeOutboundCalls } from "../config";
import {
  listVoiceCalls,
  getLatestVoiceCall,
  getAudioPath,
  upsertVoiceCall,
  type VoiceCallRow,
} from "../db";
import { readAudioStream, AudioNotFoundError } from "../audio-storage";
import type { VoiceCallRecord } from "../types";
import { requireSharedSecret } from "../middleware/auth";
import { outboundLimiter } from "../middleware/rate-limit";
import fs from "node:fs";
import path from "node:path";

const router = Router();

function rowToJson(row: VoiceCallRow) {
  let transcript: Array<{ role: string; message: string; timeInCallSecs: number }> | null = null;
  if (row.transcript_json) {
    try {
      transcript = JSON.parse(row.transcript_json);
    } catch {
      transcript = null;
    }
  }
  return {
    candidateId: row.candidate_id,
    elevenLabsConversationId: row.eleven_labs_conversation_id,
    twilioCallSid: row.twilio_call_sid,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    callOutcome: row.call_outcome,
    recoveredCents: row.recovered_cents,
    audioPath: row.audio_path,
    audioFetchedAt: row.audio_fetched_at,
    transcript,
  };
}

// E.164: leading '+', country code 1-9, then 6-14 digits.
const E164 = /^\+[1-9]\d{6,14}$/;

const OutboundCallSchema = z.object({
  toNumber: z.string().regex(E164, "toNumber must be E.164 (e.g. +15551234567)"),
  candidateId: z.string().regex(/^disp_[A-Za-z0-9_]+$/).max(64),
  caseNumber: z.string().min(1).max(64),
  merchantName: z.string().min(1).max(120),
  denialReason: z.string().min(1).max(1000),
});

/**
 * Resolve the allowlist of phone numbers we'll dial.
 *
 * Precedence:
 *   1. ALLOWED_CALL_NUMBERS env (comma-separated E.164 list) — explicit policy.
 *   2. DOORDASH_SUPPORT_NUMBER env — implicit single-number allowlist used in
 *      the demo wiring.
 *   3. No allowlist — only the E.164 format check applies. A boot-time warning
 *      flags this so prod accidents are visible in logs.
 */
function resolveAllowlist(): Set<string> | null {
  const explicit = process.env["ALLOWED_CALL_NUMBERS"];
  if (explicit) {
    return new Set(
      explicit
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    );
  }
  const fallback = process.env["DOORDASH_SUPPORT_NUMBER"];
  if (fallback) return new Set([fallback]);
  return null;
}

router.post(
  "/calls/outbound",
  outboundLimiter,
  requireSharedSecret,
  async (req, res) => {
    const parsed = OutboundCallSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "invalid_request",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }

    const { toNumber, candidateId, caseNumber, merchantName, denialReason } =
      parsed.data;

    if (!canMakeOutboundCalls()) {
      res.status(503).json({
        error: "voice_not_configured",
        message: "ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, and ELEVENLABS_PHONE_NUMBER_ID must all be set in apps/voice/.env.local",
      });
      return;
    }

    const allowlist = resolveAllowlist();
    if (allowlist && !allowlist.has(toNumber)) {
      console.warn(
        `[calls/outbound] rejected toNumber=${toNumber} — not in ALLOWED_CALL_NUMBERS / DOORDASH_SUPPORT_NUMBER`
      );
      res.status(403).json({ error: "to_number_not_allowed" });
      return;
    }

    let result: Awaited<ReturnType<typeof initiateOutboundCall>>;

    try {
      result = await initiateOutboundCall({
        toNumber,
        dynamicVariables: {
          case_number: caseNumber,
          merchant_name: merchantName,
          denial_reason: denialReason,
          case_id: candidateId,
        },
      });
    } catch (err) {
      // Log full error server-side; never forward upstream details to clients
      // (could leak quota / internal IDs from ElevenLabs).
      console.error("[calls/outbound] ElevenLabs error:", err);
      res.status(502).json({ error: "Failed to initiate outbound call" });
      return;
    }

    const record: VoiceCallRecord = {
      candidateId,
      elevenLabsConversationId: result.conversation_id,
      twilioCallSid: result.callSid,
      startedAt: new Date().toISOString(),
    };

    // Persist immediately so the Calls tab shows a "Live" row right away.
    // The post-call webhook will upsert over this with transcript + outcome.
    upsertVoiceCall({
      candidateId,
      elevenLabsConversationId: result.conversation_id,
      twilioCallSid: result.callSid,
      startedAt: record.startedAt,
    });

    console.log(
      `[calls/outbound] Call started — conversationId=${result.conversation_id} callSid=${result.callSid}`
    );

    res.status(201).json(record);
  }
);

router.get("/calls/history", requireSharedSecret, (_req, res) => {
  res.json(listVoiceCalls().map(rowToJson));
});

// /calls/status/:candidateId is intentionally NOT auth-gated: the dashboard
// polls it directly from the browser. CORS is locked to WEB_ORIGIN in
// server.ts, which is the actual cross-origin defense here. Direct curl can
// still read a candidate's status, but the response is small (latest call
// metadata for one ID) and contains no PII or financial detail beyond what the
// dashboard already shows the operator.
router.get("/calls/status/:candidateId", (req, res) => {
  const row = getLatestVoiceCall(req.params.candidateId);
  if (!row) {
    res.status(404).json({ error: "no_call", candidateId: req.params.candidateId });
    return;
  }
  res.json(rowToJson(row));
});

// ---------------------------------------------------------------------------
// Worker 5: Serve stored MP3 audio for a conversation.
// No auth — same justification as /calls/status/:candidateId above.
// CORS is the defense (locked to WEB_ORIGIN in server.ts).
// ---------------------------------------------------------------------------
const CONV_ID_RE = /^[A-Za-z0-9_-]{8,128}$/;

router.get("/calls/:conversationId/audio", (req, res) => {
  const { conversationId } = req.params;
  if (!CONV_ID_RE.test(conversationId)) {
    res.status(400).json({ error: "invalid_conversation_id" });
    return;
  }

  const storedPath = getAudioPath(conversationId);
  if (!storedPath) {
    res.status(404).json({ error: "audio_not_ready" });
    return;
  }

  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "private, max-age=3600");
  try {
    readAudioStream(conversationId).pipe(res);
  } catch (err) {
    if (err instanceof AudioNotFoundError) {
      res.status(404).json({ error: "audio_not_ready" });
    } else {
      throw err;
    }
  }
});

// ---------------------------------------------------------------------------
// Worker 5: Live transcript for an in-progress call.
// Returns ElevenLabs's current view. The web app wraps this in an SSE loop.
// ---------------------------------------------------------------------------
router.get("/calls/:conversationId/live-transcript", async (req, res) => {
  const { conversationId } = req.params;
  if (!CONV_ID_RE.test(conversationId)) {
    res.status(400).json({ error: "invalid_conversation_id" });
    return;
  }

  // Fixture mode: replay canned transcript for demo safety
  if (process.env["CALLS_LIVE_FIXTURE"] === "on") {
    try {
      const fixturePath = path.join(
        __dirname,
        "../../__fixtures__/live-transcript-replay.json"
      );
      const snapshots = JSON.parse(fs.readFileSync(fixturePath, "utf-8"));
      // Return the last snapshot (caller polls repeatedly; each poll gets
      // progressively more turns via the fixture's growing arrays)
      const idx = Math.min(
        Math.floor((Date.now() / 2000) % snapshots.length),
        snapshots.length - 1
      );
      res.json(snapshots[idx]);
      return;
    } catch (err) {
      console.warn("[live-transcript] fixture mode failed, falling through:", err);
    }
  }

  try {
    const detail = await fetchConversationDetail(conversationId);
    res.json({
      status: detail.status,
      transcript: detail.transcript,
      callDurationSecs: detail.metadata?.call_duration_secs ?? 0,
      hasAudio: detail.has_audio ?? false,
    });
  } catch (err) {
    console.error("[live-transcript]", err);
    res.status(502).json({ error: "upstream_failed" });
  }
});

export default router;
