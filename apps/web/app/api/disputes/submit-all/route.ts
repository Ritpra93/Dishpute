import { NextResponse } from "next/server";
import { createMockScraper } from "@/lib/mock-scraper";
import {
  getCandidate,
  listSubmittableClassifications,
  upsertOutcome,
  upsertSubmission,
} from "@/lib/repo";
import { MERIT_THRESHOLDS } from "@/lib/types";

export const dynamic = "force-dynamic";

const DENIED_IDS = new Set(["disp_0008", "disp_0017", "disp_0023"]);
const APPROVED_IDS = new Set(["disp_0001", "disp_0004", "disp_0011"]);

export async function POST() {
  const scraper = createMockScraper({ latencyMs: 0 });

  const submittable = listSubmittableClassifications(MERIT_THRESHOLDS.AUTO_SUBMIT);

  const submissions = [];
  for (const cls of submittable) {
    const candidate = getCandidate(cls.candidateId);
    if (!candidate) continue;
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
    } else if (APPROVED_IDS.has(cls.candidateId)) {
      upsertOutcome({
        candidateId: cls.candidateId,
        outcome: "approved",
        refundedCents: cls.recoverableCents,
        adjudicatedAt: new Date().toISOString(),
        escalateToVoice: false,
      });
    } else {
      upsertOutcome({
        candidateId: cls.candidateId,
        outcome: "pending",
        refundedCents: 0,
        escalateToVoice: false,
      });
    }
    submissions.push(submission);
  }

  return NextResponse.json({
    submitted: submissions.length,
    results: submissions,
  });
}
