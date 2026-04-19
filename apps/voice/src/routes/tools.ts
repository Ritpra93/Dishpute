import { Router, type Router as ExpressRouter } from "express";
import { getCandidateWithClassification } from "../db";
import { toolsLimiter } from "../middleware/rate-limit";

const router: ExpressRouter = Router();

// All tool routes are reachable by ElevenLabs from the cloud during a
// conversation, so we can't gate them on a shared secret. Rate-limit per IP
// instead — caps abuse without breaking the agent flow.
router.use("/tools", toolsLimiter);

// All tool endpoints must return 200 in under 1.5s — even on error.
// ElevenLabs does NOT retry 4xx; a crash here = dead air on stage.

const FIXTURE_EVIDENCE =
  "POS record confirms all items dispatched. Kitchen pickup photo timestamped 19:42 shows complete order. Driver log confirms delivery at 19:58 with no redelivery requests.";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

router.post("/tools/lookup_case", (req, res) => {
  const { caseId } = req.body as { caseId?: string };

  if (!caseId) {
    res.json({
      error: "No caseId provided",
      evidenceSummary: "Unable to look up case — no ID supplied.",
    });
    return;
  }

  try {
    const row = getCandidateWithClassification(caseId);
    if (row) {
      res.json({
        caseNumber: caseId,
        merchantName: "House of Curry",
        chargeAmount: formatCents(row.charge_amount_cents),
        chargeType: row.charge_type,
        evidenceSummary: row.reasoning ?? FIXTURE_EVIDENCE,
      });
      return;
    }
  } catch (err) {
    console.error("[tools/lookup_case] DB error:", err);
  }

  // Fixture fallback — case not in DB (e.g. ElevenLabs testing a stale ID).
  // Must still return 200 with speakable content so the agent doesn't stall.
  res.json({
    caseNumber: caseId,
    merchantName: "House of Curry",
    chargeAmount: "$49.20",
    denialReason: "Insufficient evidence provided at time of dispute",
    evidenceSummary: FIXTURE_EVIDENCE,
  });
});

router.post("/tools/reference_evidence", (req, res) => {
  const { caseId } = req.body as { caseId?: string };

  if (!caseId) {
    res.json({ citations: ["Unable to retrieve evidence — no case ID supplied."] });
    return;
  }

  res.json({
    citations: [
      `POS transaction for case ${caseId} confirms all items were prepared and bagged`,
      "Kitchen pickup photo timestamped 19:42 shows complete order in sealed bag",
      "Driver log shows on-time delivery with no customer contact issues",
      "Color-coded non-veg container sticker confirms correct item was packed per SOP",
    ],
  });
});

router.post("/tools/escalate_to_supervisor", (req, res) => {
  const { reason, caseId } = req.body as { reason?: string; caseId?: string };

  const ticketId = `ESC-${Date.now()}`;

  console.log(
    `[tools/escalate] Escalation logged — ticket=${ticketId} case=${caseId} reason=${reason}`
  );

  res.json({
    escalationTicketId: ticketId,
    message:
      "Escalation logged. A supervisor will review this case within 24 hours and reach out to the merchant directly.",
  });
});

export default router;
