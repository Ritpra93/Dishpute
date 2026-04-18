import { NextResponse } from "next/server";
import { getCandidate, getClassification, upsertOutcome } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * Voice escalation trigger.
 *
 * MERGE NOTE (apps/voice integration):
 *   When apps/voice ships, set VOICE_ESCALATE_URL to its /api/voice/escalate
 *   endpoint and remove the demo-only "stubbed" branch below.
 *
 *   Contract for the upstream call (per docs/INTERFACES.md):
 *     POST { candidateId, candidate, classification }
 *     -> { conversationId, callSid }
 *
 *   apps/voice will then call our /api/voice/callback when the call ends with
 *   { candidateId, callOutcome, recoveredCents } so we can update the outcome row.
 */

interface EscalateBody {
  reason?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const _body = (await request.json().catch(() => ({}))) as EscalateBody;
  void _body;

  const candidate = getCandidate(id);
  const classification = getClassification(id);
  if (!candidate || !classification) {
    return NextResponse.json(
      { error: `Candidate ${id} not found or has no classification.` },
      { status: 404 }
    );
  }

  upsertOutcome({
    candidateId: id,
    outcome: "denied",
    refundedCents: 0,
    adjudicatedAt: new Date().toISOString(),
    escalateToVoice: true,
  });

  const voiceUrl = process.env.VOICE_ESCALATE_URL;
  if (!voiceUrl) {
    return NextResponse.json({
      candidateId: id,
      mode: "stubbed",
      conversationId: `convo_stub_${id}`,
      callSid: `CA_stub_${id}`,
      message:
        "apps/voice not wired up yet — set VOICE_ESCALATE_URL to enable real escalation.",
    });
  }

  try {
    const upstream = await fetch(voiceUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ candidateId: id, candidate, classification }),
    });
    if (!upstream.ok) {
      throw new Error(`apps/voice returned HTTP ${upstream.status}`);
    }
    const data = await upstream.json();
    return NextResponse.json({ candidateId: id, mode: "live", ...data });
  } catch (err) {
    return NextResponse.json(
      {
        candidateId: id,
        mode: "error",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
