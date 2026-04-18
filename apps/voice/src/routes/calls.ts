import { Router, type Request, type Response } from "express";
import type { OutboundCallRequest, VoiceCallRecord } from "../types.js";

export const callsRouter = Router();

callsRouter.post("/calls/outbound", (req: Request, res: Response) => {
  const body = req.body as Partial<OutboundCallRequest>;

  if (!body?.candidateId || !body?.phoneNumber) {
    return res
      .status(400)
      .json({ error: "candidateId and phoneNumber are required" });
  }

  const now = new Date().toISOString();
  const stub: VoiceCallRecord = {
    candidateId: body.candidateId,
    elevenLabsConversationId: `stub_conv_${Date.now()}`,
    twilioCallSid: `CAstub${Math.random().toString(36).slice(2, 14)}`,
    startedAt: now,
  };

  return res.status(200).json(stub);
});
