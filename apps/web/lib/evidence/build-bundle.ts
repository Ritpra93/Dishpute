import { getCandidate, getClassification } from "@/lib/repo";
import {
  DEMO_MERCHANT,
  FIXTURE_DISPUTES,
  type DisputeCandidate,
  type ClassifiedDispute,
  type EnrichedDispute,
  type EvidenceArtifact,
  type EvidenceBundle,
} from "@/lib/types";

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Resolve a candidate for an evidence bundle. Tries (1) the live SQLite repo,
 * then (2) the in-memory FIXTURE_DISPUTES set, then (3) synthesizes a generic
 * placeholder candidate so the preview UI never returns 404 for an arbitrary
 * id (e.g. a pre-staged warning whose underlying order isn't seeded yet).
 */
function resolveCandidate(id: string): {
  candidate: DisputeCandidate;
  classification: ClassifiedDispute | undefined;
  isSynthetic: boolean;
} {
  const live = getCandidate(id);
  if (live) {
    return {
      candidate: live,
      classification: getClassification(id),
      isSynthetic: false,
    };
  }

  const fixture = FIXTURE_DISPUTES.find((d) => d.id === id);
  if (fixture) {
    return { candidate: fixture, classification: undefined, isSynthetic: true };
  }

  // Last-resort synthesis — covers warning artifactIds, demo links typed by
  // hand, and anything else that doesn't map to a seeded candidate.
  const nowIso = new Date().toISOString();
  const synthetic: DisputeCandidate = {
    id,
    platform: "doordash",
    orderId: `ord_synth_${id.slice(-4)}`,
    chargeType: "missing_item",
    chargeAmountCents: 2450,
    itemsReported: [
      { name: "Chicken Tikka Masala", quantity: 1, refundAmountCents: 1690 },
      { name: "Garlic Naan", quantity: 2, refundAmountCents: 760 },
    ],
    customerComment:
      "Items missing — opened the bag in front of the driver, only got the rice.",
    orderTimestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    chargeTimestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    disputeDeadline: new Date(
      Date.now() + 1000 * 60 * 60 * 24 * 14
    ).toISOString(),
    portalUrl: "https://merchants.doordash.com/orders",
    rawText: `Synthetic preview candidate for ${id} generated at ${nowIso}.`,
  };
  return { candidate: synthetic, classification: undefined, isSynthetic: true };
}

/**
 * Build a deterministic EvidenceBundle for a dispute. The artifacts are
 * synthesised from the candidate + classification — no external screenshot
 * fetching is performed. Worker 1's bundler will swap into this same shape.
 *
 * Always returns a bundle (never null) so the preview UI degrades gracefully
 * for ids that haven't been seeded into the live repo yet.
 */
export function buildEvidenceBundle(
  enriched: Pick<EnrichedDispute, "id">
): EvidenceBundle {
  const { candidate, classification, isSynthetic } = resolveCandidate(
    enriched.id
  );

  const generatedAt = new Date().toISOString();
  const itemSummary = candidate.itemsReported
    .map((i) => `${i.quantity}× ${i.name}`)
    .join(", ");

  const artifacts: EvidenceArtifact[] = [
    {
      candidateId: candidate.id,
      kind: "screenshot",
      title: `Step 1 — ${candidate.platform} dispute portal`,
      capturedAt: candidate.chargeTimestamp,
      source: candidate.portalUrl,
      claudeAnnotation:
        "Portal landing — Counter located the disputed charge in the merchant's open queue.",
    },
    {
      candidateId: candidate.id,
      kind: "dom_element",
      title: "Step 2 — Charge row at moment of detection",
      capturedAt: candidate.chargeTimestamp,
      source: `data-dispute-id="${candidate.id}"`,
      text: `Charge type: ${candidate.chargeType}\nAmount: ${fmtMoney(
        candidate.chargeAmountCents
      )}\nItems: ${itemSummary}`,
    },
    {
      candidateId: candidate.id,
      kind: "receipt_text",
      title: "Step 3 — POS-side order receipt",
      capturedAt: candidate.orderTimestamp,
      text: `Order #${candidate.orderId}\nPlaced ${new Date(
        candidate.orderTimestamp
      ).toLocaleString("en-US")}\n${itemSummary}`,
    },
  ];

  if (candidate.customerComment) {
    artifacts.push({
      candidateId: candidate.id,
      kind: "claude_annotation",
      title: "Step 4 — Customer comment context",
      capturedAt: generatedAt,
      text: candidate.customerComment,
      claudeAnnotation: classification?.reasoning,
    });
  }

  if (isSynthetic) {
    artifacts.push({
      candidateId: candidate.id,
      kind: "claude_annotation",
      title: "Pre-staged evidence packet",
      capturedAt: generatedAt,
      text:
        "This packet was assembled proactively from an early-warning signal — Counter has captured the portal state, POS receipt, and customer-comment context before the dispute window opens.",
      claudeAnnotation:
        "Pre-staged so we can file within seconds of the charge appearing.",
    });
  }

  return {
    candidateId: candidate.id,
    caseNumber: `CTR-${candidate.id.toUpperCase().slice(-8)}`,
    merchantName: DEMO_MERCHANT.name,
    generatedAt,
    totalRecoverableCents:
      classification?.recoverableCents ?? candidate.chargeAmountCents,
    summary: classification?.draftedDisputeText
      ? classification.draftedDisputeText.slice(0, 320)
      : `Counter is filing a ${candidate.chargeType.replace(
          /_/g,
          " "
        )} dispute on ${fmtMoney(candidate.chargeAmountCents)} for order #${
          candidate.orderId
        } at ${candidate.platform}. Items: ${itemSummary}.`,
    artifacts,
  };
}
