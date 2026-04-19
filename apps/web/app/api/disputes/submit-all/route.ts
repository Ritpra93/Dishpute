import { NextResponse } from "next/server";
import { DEMO_APPROVED_IDS, DEMO_DENIED_IDS } from "@/lib/mock-scraper";
import { getScraper } from "@/lib/services";
import { rateLimit, requireApiKey } from "@/lib/api-guard";
import {
  getCandidate,
  listSubmittableClassifications,
  upsertOutcome,
  upsertSubmission,
} from "@/lib/repo";
import { MERIT_THRESHOLDS } from "@/lib/types";

export const dynamic = "force-dynamic";

const DENIED_IDS = new Set<string>(DEMO_DENIED_IDS);
const APPROVED_IDS = new Set<string>(DEMO_APPROVED_IDS);

export async function POST(request: Request) {
  const rl = rateLimit(request, "submit-all", { limit: 3, windowMs: 60_000 });
  if (rl) return rl;
  const auth = requireApiKey(request);
  if (auth) return auth;

  const scraper = getScraper();

  const submittable = listSubmittableClassifications(MERIT_THRESHOLDS.AUTO_SUBMIT);

  let approved = 0;
  let denied = 0;
  let pending = 0;
  let skipped = 0;
  let totalRefundedCents = 0;

  for (const cls of submittable) {
    const candidate = getCandidate(cls.candidateId);
    if (!candidate) {
      skipped += 1;
      continue;
    }
    const submission = await scraper.submitDispute({
      candidate,
      draftedText: cls.draftedDisputeText,
    });
    upsertSubmission(submission);

    if (DENIED_IDS.has(cls.candidateId)) {
      upsertOutcome({
        candidateId: cls.candidateId,
        outcome: "denied",
        refundedCents: 0,
        adjudicatedAt: new Date().toISOString(),
        escalateToVoice: cls.meritScore >= 70,
      });
      denied += 1;
    } else if (APPROVED_IDS.has(cls.candidateId)) {
      upsertOutcome({
        candidateId: cls.candidateId,
        outcome: "approved",
        refundedCents: cls.recoverableCents,
        adjudicatedAt: new Date().toISOString(),
        escalateToVoice: false,
      });
      approved += 1;
      totalRefundedCents += cls.recoverableCents;
    } else {
      upsertOutcome({
        candidateId: cls.candidateId,
        outcome: "pending",
        refundedCents: 0,
        escalateToVoice: false,
      });
      pending += 1;
    }
  }

  return NextResponse.json({
    submitted: approved + denied + pending,
    approved,
    denied,
    pending,
    skipped,
    totalRefundedCents,
  });
}
