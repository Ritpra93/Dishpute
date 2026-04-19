import { Router } from "express";
import { initiateOutboundCall } from "../elevenlabs";
import {
  listVoiceCalls,
  getLatestVoiceCall,
  type VoiceCallRow,
} from "../db";
import type { VoiceCallRecord } from "../types";

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
    transcript,
  };
}

interface OutboundCallRequest {
  toNumber: string;
  candidateId: string;
  caseNumber: string;
  merchantName: string;
  denialReason: string;
}

router.post("/calls/outbound", async (req, res) => {
  const body = req.body as Partial<OutboundCallRequest>;

  const toNumber = body.toNumber ?? process.env["DOORDASH_SUPPORT_NUMBER"] ?? "+18005559999";
  const candidateId = body.candidateId ?? "unknown";
  const caseNumber = body.caseNumber ?? candidateId;
  const merchantName = body.merchantName ?? "House of Curry";
  const denialReason = body.denialReason ?? "No reason provided";

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
    console.error("[calls/outbound] ElevenLabs error:", err);
    res.status(502).json({
      error: "Failed to initiate outbound call",
      detail: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  const record: VoiceCallRecord = {
    candidateId,
    elevenLabsConversationId: result.conversation_id,
    twilioCallSid: result.callSid,
    startedAt: new Date().toISOString(),
  };

  console.log(
    `[calls/outbound] Call started — conversationId=${result.conversation_id} callSid=${result.callSid}`
  );

  res.status(201).json(record);
});

router.get("/calls/history", (_req, res) => {
  res.json(listVoiceCalls().map(rowToJson));
});

router.get("/calls/status/:candidateId", (req, res) => {
  const row = getLatestVoiceCall(req.params.candidateId);
  if (!row) {
    res.status(404).json({ error: "no_call", candidateId: req.params.candidateId });
    return;
  }
  res.json(rowToJson(row));
});

export default router;
