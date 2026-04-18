import { NextResponse } from "next/server";
import { getCandidate, getClassification, upsertOutcome } from "@/lib/repo";
import { DEMO_MERCHANT } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Voice escalation trigger. Forwards the denied dispute to apps/voice's
 * /calls/outbound endpoint, which initiates an ElevenLabs + Twilio call.
 *
 * Wire-up at demo time:
 *   VOICE_ESCALATE_URL  = https://<ngrok>.ngrok-free.dev/calls/outbound
 *   DOORDASH_SUPPORT_NUMBER = +1XXXXXXXXXX (E.164, verified in Twilio)
 *
 * If VOICE_ESCALATE_URL is unset the route returns a deterministic stub so
 * the UI doesn't crash during offline rehearsal.
 *
 * Contract with apps/voice POST /calls/outbound (see apps/voice/src/routes/calls.ts):
 *   Request  { toNumber, candidateId, caseNumber, merchantName, denialReason }
 *   Response { candidateId, elevenLabsConversationId, twilioCallSid, startedAt }
 */

interface EscalateBody {
  /** Optional override for denial-reason text (otherwise derived). */
  reason?: string;
}

/** Turn an ordId like "ord_4561" into a 4-digit case number the agent can say. */
function caseNumberFromCandidate(candidateId: string, orderId: string): string {
  const m = orderId.match(/\d+/);
  return m ? m[0] : candidateId.replace(/\D/g, "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as EscalateBody;

  const candidate = getCandidate(id);
  const classification = getClassification(id);
  if (!candidate || !classification) {
    return NextResponse.json(
      { error: `Candidate ${id} not found or has no classification.` },
      { status: 404 }
    );
  }

  // Mark this dispute as denied + voice-eligible (idempotent; click can happen
  // before or after the platform's own adjudication).
  upsertOutcome({
    candidateId: id,
    outcome: "denied",
    refundedCents: 0,
    adjudicatedAt: new Date().toISOString(),
    escalateToVoice: true,
  });

  const caseNumber = caseNumberFromCandidate(id, candidate.orderId);
  const denialReason =
    body.reason ??
    `Platform denied ${classification.resolvedChargeType} dispute citing insufficient evidence.`;

  const voicePayload = {
    toNumber: process.env["DOORDASH_SUPPORT_NUMBER"] ?? "",
    candidateId: id,
    caseNumber,
    merchantName: DEMO_MERCHANT.name,
    denialReason,
  };

  const voiceUrl = process.env["VOICE_ESCALATE_URL"];
  if (!voiceUrl) {
    return NextResponse.json({
      candidateId: id,
      mode: "stubbed",
      conversationId: `convo_stub_${id}`,
      callSid: `CA_stub_${id}`,
      payload: voicePayload,
      message:
        "apps/voice not wired up — set VOICE_ESCALATE_URL to enable real escalation.",
    });
  }

  try {
    const upstream = await fetch(voiceUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(voicePayload),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      throw new Error(`apps/voice returned HTTP ${upstream.status}: ${text}`);
    }
    const data = await upstream.json();
    return NextResponse.json({
      candidateId: id,
      mode: "live",
      payload: voicePayload,
      ...data,
    });
  } catch (err) {
    return NextResponse.json(
      {
        candidateId: id,
        mode: "error",
        payload: voicePayload,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
