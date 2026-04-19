import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_APPROVED_IDS, DEMO_DENIED_IDS } from "@/lib/mock-scraper";
import { getScraper } from "@/lib/services";
import { parseParam } from "@/lib/parse-request";
import { rateLimit, requireApiKey } from "@/lib/api-guard";
import {
  getCandidate,
  getClassification,
  upsertOutcome,
  upsertSubmission,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

const DENIED_IDS = new Set<string>(DEMO_DENIED_IDS);
const APPROVED_IDS = new Set<string>(DEMO_APPROVED_IDS);

const CandidateIdSchema = z.string().regex(/^disp_[0-9]+$/);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = rateLimit(request, "submit", { limit: 30, windowMs: 60_000 });
  if (rl) return rl;
  const auth = requireApiKey(request);
  if (auth) return auth;

  const { id: rawId } = await params;
  const idCheck = parseParam(rawId, CandidateIdSchema, "candidate id");
  if (!idCheck.ok) return idCheck.response;
  const id = idCheck.data;

  const candidate = getCandidate(id);
  const classification = getClassification(id);

  if (!candidate || !classification) {
    return NextResponse.json(
      { error: "Candidate or classification not found." },
      { status: 404 }
    );
  }

  const scraper = getScraper();
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
