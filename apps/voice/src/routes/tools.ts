import { Router } from "express";

const router = Router();

// All tool endpoints must return 200 in under 1.5s — even on error.
// ElevenLabs does NOT retry 4xx; a crash here = dead air on stage.

router.post("/tools/lookup_case", (req, res) => {
  const { caseId } = req.body as { caseId?: string };

  if (!caseId) {
    res.json({
      error: "No caseId provided",
      evidenceSummary: "Unable to look up case — no ID supplied.",
    });
    return;
  }

  // In a full integration this would query the shared SQLite DB.
  // For the demo, return realistic fixture data keyed to our demo cases.
  res.json({
    caseNumber: caseId,
    merchantName: "House of Curry",
    chargeAmount: "$49.20",
    denialReason: "Insufficient evidence provided at time of dispute",
    evidenceSummary:
      "POS record confirms all items dispatched. Kitchen pickup photo timestamped 19:42 shows complete order. Driver log confirms delivery at 19:58 with no redelivery requests.",
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
