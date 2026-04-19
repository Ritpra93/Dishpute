import { NextResponse } from "next/server";
import { z } from "zod";
import { getCandidate, getClassification, upsertOutcome } from "@/lib/repo";
import { parseJson, parseParam } from "@/lib/parse-request";
import { DEMO_MERCHANT } from "@/lib/types";
import { preflight as vantaPreflight } from "@/lib/vanta-gate";

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

const CandidateIdSchema = z.string().regex(/^disp_[0-9]+$/);

const EscalateBodySchema = z.object({
  reason: z.string().max(500).optional(),
});

function caseNumberFromCandidate(candidateId: string, orderId: string): string {
  const m = orderId.match(/\d+/);
  return m ? m[0] : candidateId.replace(/\D/g, "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const idCheck = parseParam(rawId, CandidateIdSchema, "candidate id");
  if (!idCheck.ok) return idCheck.response;
  const id = idCheck.data;

  const parsed = await parseJson(request, EscalateBodySchema);
  if (!parsed.ok) return parsed.response;

  const candidate = getCandidate(id);
  const classification = getClassification(id);
  if (!candidate || !classification) {
    return NextResponse.json(
      { error: "Candidate not found or has no classification." },
      { status: 404 }
    );
  }

  // Vanta pre-flight gate (the AgentSafe pattern): refuse to take an
  // autonomous action while critical SOC 2 controls are failing. We perform
  // this check BEFORE writing any outcome state so a blocked escalation
  // leaves the dispute in its prior state.
  const gate = await vantaPreflight();
  if (!gate.allowed) {
    console.warn("[escalate] blocked by Vanta pre-flight gate", {
      candidateId: id,
      failingCritical: gate.failingCritical,
    });
    return NextResponse.json(
      {
        error: gate.blockedReason ?? "Blocked by Vanta pre-flight gate.",
        code: "vanta_pre_flight_blocked",
        candidateId: id,
        gate: {
          source: gate.source,
          controlsChecked: gate.controlsChecked,
          failingCritical: gate.failingCritical,
        },
      },
      { status: 409 },
    );
  }

  upsertOutcome({
    candidateId: id,
    outcome: "denied",
    refundedCents: 0,
    adjudicatedAt: new Date().toISOString(),
    escalateToVoice: true,
  });

  const caseNumber = caseNumberFromCandidate(id, candidate.orderId);
  const denialReason =
    parsed.data.reason ??
    `Platform denied ${classification.resolvedChargeType} dispute citing insufficient evidence.`;

  const voicePayload = {
    toNumber: process.env["DOORDASH_SUPPORT_NUMBER"] ?? "",
    candidateId: id,
    caseNumber,
    merchantName: DEMO_MERCHANT.name,
    denialReason,
  };

  const gateMeta = {
    source: gate.source,
    controlsChecked: gate.controlsChecked,
    passed: true,
  };

  const voiceUrl = process.env["VOICE_ESCALATE_URL"];
  if (!voiceUrl) {
    return NextResponse.json({
      candidateId: id,
      mode: "stubbed",
      conversationId: `convo_stub_${id}`,
      callSid: `CA_stub_${id}`,
      payload: voicePayload,
      vantaGate: gateMeta,
      message:
        "VOICE_ESCALATE_URL not set — no real phone call placed. See .env.example for the demo runbook.",
    });
  }

  try {
    const upstream = await fetch(voiceUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(voicePayload),
    });
    if (!upstream.ok) {
      // Read but DO NOT return the upstream body — log server-side only.
      const upstreamBody = await upstream.text().catch(() => "");
      console.error("[escalate] voice upstream failed", {
        status: upstream.status,
        body: upstreamBody.slice(0, 500),
      });
      return NextResponse.json(
        {
          error: "Voice escalation failed",
          code: "voice_upstream_error",
          upstreamStatus: upstream.status,
          candidateId: id,
        },
        { status: 502 }
      );
    }
    const data = (await upstream.json()) as {
      elevenLabsConversationId?: string;
      twilioCallSid?: string;
      startedAt?: string;
    };
    return NextResponse.json({
      candidateId: id,
      mode: "live",
      payload: voicePayload,
      vantaGate: gateMeta,
      conversationId: data.elevenLabsConversationId,
      callSid: data.twilioCallSid,
      twilioCallSid: data.twilioCallSid,
      startedAt: data.startedAt,
    });
  } catch (err) {
    console.error("[escalate] voice request errored", {
      candidateId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      {
        error: "Voice escalation failed",
        code: "voice_unreachable",
        hint: "Is apps/voice running? Try `pnpm -F @counter/voice dev`.",
        candidateId: id,
      },
      { status: 502 }
    );
  }
}
