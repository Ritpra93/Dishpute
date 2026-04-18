import { NextResponse } from "next/server";
import { createMockScraper, DEMO_APPROVED_IDS, DEMO_DENIED_IDS } from "@/lib/mock-scraper";
import {
  getCandidate,
  getClassification,
  upsertOutcome,
  upsertSubmission,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

const DENIED_IDS = new Set<string>(DEMO_DENIED_IDS);
const APPROVED_IDS = new Set<string>(DEMO_APPROVED_IDS);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const candidate = getCandidate(id);
  const classification = getClassification(id);

  if (!candidate || !classification) {
    return NextResponse.json(
      { error: `Candidate ${id} or its classification not found.` },
      { status: 404 }
    );
  }

  const scraper = createMockScraper({ latencyMs: 0 });
  const submission = await scraper.submitDispute({
    candidate,
    draftedText: classification.draftedDisputeText,
  });
  upsertSubmission(submission);

  if (DENIED_IDS.has(id)) {
    upsertOutcome({
      candidateId: id,
      outcome: "denied",
      refundedCents: 0,
      adjudicatedAt: new Date().toISOString(),
      escalateToVoice: classification.meritScore >= 70,
    });
  } else if (APPROVED_IDS.has(id)) {
    upsertOutcome({
      candidateId: id,
      outcome: "approved",
      refundedCents: classification.recoverableCents,
      adjudicatedAt: new Date().toISOString(),
      escalateToVoice: false,
    });
  } else {
    upsertOutcome({
      candidateId: id,
      outcome: "pending",
      refundedCents: 0,
      escalateToVoice: false,
    });
  }

  return NextResponse.json(submission);
}
