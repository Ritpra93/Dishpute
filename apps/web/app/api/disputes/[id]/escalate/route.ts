import { NextResponse } from "next/server";
import { z } from "zod";
import { getCandidate, getClassification, upsertOutcome } from "@/lib/repo";
import { parseJson, parseParam } from "@/lib/parse-request";
import { rateLimit, requireApiKey } from "@/lib/api-guard";
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
 * If no voice URL can be resolved the route returns a deterministic stub so
 * the UI doesn't crash during offline rehearsal.
 *
 * **Development:** When `NODE_ENV === "development"` and `VOICE_ESCALATE_URL`
 * is unset, defaults to `{VOICE_SERVICE_URL or http://localhost:4000}/calls/outbound`
 * and falls back to `DEMO_SUPPORT_REP_PHONE` / `+15551234567` for `toNumber` so
 * local `pnpm dev:web` + `pnpm dev:voice` match full-stack behavior without
 * duplicating env into `apps/web/.env.local`. Production and `next build` still
 * require explicit `VOICE_ESCALATE_URL` / `DOORDASH_SUPPORT_NUMBER`.
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

/** Explicit `VOICE_ESCALATE_URL` only; used to tell whether the user set the env var. */
function hasExplicitVoiceEscalateUrl(): boolean {
  const v = process.env["VOICE_ESCALATE_URL"];
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Resolve outbound URL: explicit env, else in **development** only default to local voice.
 * Tests (`NODE_ENV=test`) and production never infer — they get stub unless env is set.
 */
function resolveVoiceEscalateUrl(): string | undefined {
  if (hasExplicitVoiceEscalateUrl()) {
    return process.env["VOICE_ESCALATE_URL"]!.trim();
  }
  if (process.env["NODE_ENV"] === "development") {
    const base = (process.env["VOICE_SERVICE_URL"] ?? "http://localhost:4000").replace(
      /\/$/,
      ""
    );
    return `${base}/calls/outbound`;
  }
  return undefined;
}

function resolveOutboundToNumber(): string {
  const n =
    process.env["DOORDASH_SUPPORT_NUMBER"] ??
    process.env["DEMO_SUPPORT_REP_PHONE"] ??
    "";
  if (typeof n === "string" && n.trim().length > 0) return n.trim();
  if (process.env["NODE_ENV"] === "development") {
    return "+15551234567";
  }
  return "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Escalation triggers a billed Twilio + ElevenLabs call. Guard the web edge
  // the same way apps/voice guards /calls/outbound.
  const rl = rateLimit(request, "escalate", { limit: 5, windowMs: 60_000 });
  if (rl) return rl;
  const auth = requireApiKey(request);
  if (auth) return auth;

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

  const caseNumber = caseNumberFromCandidate(id, candidate.orderId);
  const denialReason =
    parsed.data.reason ??
    `Platform denied ${classification.resolvedChargeType} dispute citing insufficient evidence.`;

  const voicePayload = {
    toNumber: resolveOutboundToNumber(),
    candidateId: id,
    caseNumber,
    merchantName: DEMO_MERCHANT.name,
    denialReason,
  };

  const voiceUrl = resolveVoiceEscalateUrl();

  // Stubbed mode keeps the original behavior: write the outcome immediately so
  // the dashboard can show the "calling..." state during offline rehearsal.
  // Live mode flips this — outcome is only written AFTER the voice service
  // confirms the call started, so a failed upstream doesn't leave a phantom
  // "escalated" row in the DB (security-review M2).
  if (!voiceUrl) {
    upsertOutcome({
      candidateId: id,
      outcome: "denied",
      refundedCents: 0,
      adjudicatedAt: new Date().toISOString(),
      escalateToVoice: true,
    });
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

  // Server-to-server header — apps/voice's requireSharedSecret middleware
  // checks this when VOICE_SHARED_SECRET is set on both sides. Empty string
  // when unset matches the middleware's permissive dev-mode behavior.
  const sharedSecret = process.env["VOICE_SHARED_SECRET"] ?? "";

  try {
    const upstream = await fetch(voiceUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-counter-token": sharedSecret,
      },
      body: JSON.stringify(voicePayload),
    });

    if (!upstream.ok) {
      const upstreamBody = await upstream.text().catch(() => "");
      console.error("[escalate] voice upstream failed", {
        status: upstream.status,
        body: upstreamBody.slice(0, 500),
      });
      let upstreamJson: Record<string, unknown> = {};
      try { upstreamJson = JSON.parse(upstreamBody); } catch { /* not JSON */ }
      return NextResponse.json(
        { error: "Voice escalation failed", candidateId: id, ...upstreamJson },
        { status: 502 }
      );
    }
    const data = await upstream.json();

    upsertOutcome({
      candidateId: id,
      outcome: "denied",
      refundedCents: 0,
      adjudicatedAt: new Date().toISOString(),
      escalateToVoice: true,
    });

    return NextResponse.json({
      candidateId: id,
      mode: "live",
      payload: voicePayload,
      ...data,
    });
  } catch (err) {
    console.error("[escalate] voice request errored", {
      candidateId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Voice escalation failed", candidateId: id },
      { status: 502 }
    );
  }
}
