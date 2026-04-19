import { getCandidate, getClassification } from "@/lib/repo";
import {
  DEMO_MERCHANT,
  type EnrichedDispute,
  type EvidenceArtifact,
  type EvidenceBundle,
} from "@/lib/types";

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Build a deterministic EvidenceBundle for a dispute. The artifacts are
 * synthesised from the candidate + classification — no external screenshot
 * fetching is performed. Worker 1's bundler will swap into this same shape.
 */
export function buildEvidenceBundle(
  enriched: Pick<EnrichedDispute, "id">
): EvidenceBundle | null {
  const candidate = getCandidate(enriched.id);
  if (!candidate) return null;
  const classification = getClassification(enriched.id);

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
