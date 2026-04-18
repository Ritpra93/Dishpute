import { Router } from "express";
import { initiateOutboundCall } from "../elevenlabs";
import type { VoiceCallRecord } from "../types";

const router = Router();

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

export default router;
