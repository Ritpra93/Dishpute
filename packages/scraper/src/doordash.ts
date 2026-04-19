// DoorDash-specific TinyFish goals targeting Worker 3's mock portal.
// Coordinate with Worker 3 before changing selectors:
//   - data-dispute-id, data-order-id, data-charge-cents, data-charge-type
//   - data-items (JSON-encoded), .customer-comment, data-order-ts, data-charge-ts
//   - "Dispute charge" button → form "Your response" field → "Submit dispute" button
//   - Confirmation ID format: CONF-XXXXXX

import type { DisputeCandidate, ErrorChargeType, SubmissionResult, TinyFishEvent } from "@counter/types";
import { FIXTURE_DISPUTES } from "@counter/types";
import { runTinyFish } from "./tinyfish";
import { runWithRetry, runWithRetryResult } from "./retry";

const MOCK_PORTAL_URL = process.env["MOCK_PORTAL_URL"] ?? "http://localhost:3000/mock-portal/disputes";

function isValidChargeType(value: unknown): value is ErrorChargeType {
  return (
    value === "missing_item" ||
    value === "wrong_item" ||
    value === "order_never_arrived" ||
    value === "cold_food" ||
    value === "customer_cancel" ||
    value === "unknown"
  );
}

function normalizeToCanonicalShape(raw: unknown): DisputeCandidate[] {
  if (!Array.isArray(raw)) {
    throw new Error(`TinyFish returned non-array: ${JSON.stringify(raw)}`);
  }

  return raw.map((row: unknown, idx) => {
    if (typeof row !== "object" || row === null) {
      throw new Error(`Row ${idx} is not an object`);
    }
    const r = row as Record<string, unknown>;

    const chargeType = isValidChargeType(r["chargeType"] ?? r["charge_type"])
      ? (r["chargeType"] ?? r["charge_type"])
      : "unknown";

    const itemsRaw = r["itemsReported"] ?? r["items_reported"] ?? [];
    const items: DisputeCandidate["itemsReported"] = Array.isArray(itemsRaw)
      ? itemsRaw.map((item: unknown) => {
          const i = item as Record<string, unknown>;
          return {
            name: String(i["name"] ?? ""),
            quantity: Number(i["quantity"] ?? 1),
            refundAmountCents: Number(i["refundAmountCents"] ?? i["refund_amount_cents"] ?? 0),
          };
        })
      : [];

    const orderId = String(r["orderId"] ?? r["order_id"] ?? "");
    const chargeAmountCents = Number(r["chargeAmountCents"] ?? r["charge_amount_cents"] ?? 0);
    const orderTimestamp = String(r["orderTimestamp"] ?? r["order_timestamp"] ?? new Date().toISOString());
    const chargeTimestamp = String(r["chargeTimestamp"] ?? r["charge_timestamp"] ?? new Date().toISOString());

    // Deadline = chargeTimestamp + 14 days
    const deadline = new Date(chargeTimestamp);
    deadline.setDate(deadline.getDate() + 14);

    return {
      id: String(r["id"] ?? r["dispute_id"] ?? `scraped_${idx}`),
      platform: "doordash" as const,
      orderId,
      chargeType: chargeType as ErrorChargeType,
      chargeAmountCents,
      itemsReported: items,
      customerComment: (r["customerComment"] ?? r["customer_comment"]) != null
        ? String(r["customerComment"] ?? r["customer_comment"])
        : undefined,
      orderTimestamp,
      chargeTimestamp,
      disputeDeadline: deadline.toISOString(),
      portalUrl: String(r["portalUrl"] ?? r["portal_url"] ?? `${MOCK_PORTAL_URL}/${r["id"] ?? idx}`),
      rawText: String(r["rawText"] ?? r["raw_text"] ?? JSON.stringify(r)),
    } satisfies DisputeCandidate;
  });
}

const LIST_GOAL = `
Navigate to the disputes table at this URL.
For each row in the table, extract the following data attributes:
- dispute_id (from data-dispute-id attribute)
- order_id (from data-order-id attribute)
- charge_amount_cents (integer, from data-charge-cents attribute)
- chargeType (from data-charge-type attribute; one of: missing_item, wrong_item, order_never_arrived, cold_food, customer_cancel, unknown)
- itemsReported (JSON array from data-items attribute; each item has name, quantity, refundAmountCents)
- customerComment (text content of the element with class "customer-comment"; omit if empty)
- orderTimestamp (ISO 8601 string from data-order-ts attribute)
- chargeTimestamp (ISO 8601 string from data-charge-ts attribute)
- portalUrl (the href of the "View dispute" link in the row)

Return ONLY a JSON array with this shape (no commentary, no markdown):
[{
  "id": string,
  "orderId": string,
  "chargeAmountCents": number,
  "chargeType": string,
  "itemsReported": [{ "name": string, "quantity": number, "refundAmountCents": number }],
  "customerComment": string | null,
  "orderTimestamp": string,
  "chargeTimestamp": string,
  "portalUrl": string
}]
`;

/**
 * List open disputes using the S3 self-healing retry chain.
 * Returns { disputes, events } so callers can forward the event log.
 */
export async function listOpenDisputesWithEvents(): Promise<{
  disputes: DisputeCandidate[];
  events: TinyFishEvent[];
}> {
  const { result, events, usedCache } = await runWithRetryResult({
    params: { url: MOCK_PORTAL_URL, goal: LIST_GOAL },
    runId: `run_list_${Date.now()}`,
    strategies: ["lite", "stealth", "cache"],
  });

  if (usedCache) {
    return { disputes: FIXTURE_DISPUTES.map((d) => ({ ...d })), events };
  }

  const parsed = normalizeToCanonicalShape(result);
  if (parsed.length === 0 && process.env["SCRAPER_MODE"] === "cache") {
    return { disputes: FIXTURE_DISPUTES.map((d) => ({ ...d })), events };
  }
  return { disputes: parsed, events };
}

/** Backward-compatible wrapper — returns just the disputes array. */
export async function listOpenDisputes(): Promise<DisputeCandidate[]> {
  const { disputes } = await listOpenDisputesWithEvents();
  return disputes;
}

/**
 * SSE generator variant — yields every TinyFishEvent from the retry chain,
 * then yields a final synthetic event with the parsed disputes.
 * This is what W2's live grid consumes.
 */
export async function* listOpenDisputesSSE(): AsyncGenerator<TinyFishEvent> {
  for await (const evt of runWithRetry({
    params: { url: MOCK_PORTAL_URL, goal: LIST_GOAL },
    runId: `run_list_${Date.now()}`,
    strategies: ["lite", "stealth", "cache"],
  })) {
    yield evt as TinyFishEvent;
  }
}

export async function submitDispute(opts: {
  candidate: DisputeCandidate;
  draftedText: string;
}): Promise<SubmissionResult> {
  const goal = `
Navigate to ${opts.candidate.portalUrl}.
Find the "Dispute charge" button and click it.
In the resulting form, find the textarea or input labelled "Your response" and paste exactly this text (do not modify it):
---
${opts.draftedText}
---
Click the "Submit dispute" button and wait for the confirmation screen to appear.
Extract the confirmation ID (format: CONF-XXXXXX) from the confirmation screen.
Return ONLY a JSON object: { "confirmationId": string }
`;

  const result = await runTinyFish({ url: opts.candidate.portalUrl, goal });

  const r = result as Record<string, unknown>;
  const confirmationId = typeof r["confirmationId"] === "string" ? r["confirmationId"] : undefined;

  return {
    candidateId: opts.candidate.id,
    submittedAt: new Date().toISOString(),
    status: confirmationId ? "submitted" : "error",
    platformConfirmationId: confirmationId,
    errorMessage: confirmationId ? undefined : `No confirmation ID in response: ${JSON.stringify(result)}`,
  };
}

export async function scrapeOutcomes(opts: {
  candidateIds: string[];
}): Promise<Array<{ candidateId: string; outcome: "approved" | "denied" | "pending"; refundedCents: number }>> {
  const idList = opts.candidateIds.join(", ");
  const goal = `
Navigate to ${MOCK_PORTAL_URL}.
For each dispute row where data-dispute-id is one of: ${idList}
Extract:
- dispute_id (from data-dispute-id)
- outcome (from data-outcome; one of: approved, denied, pending)
- refunded_cents (integer, from data-refunded-cents; 0 if not present)
Return ONLY a JSON array: [{ "candidateId": string, "outcome": string, "refundedCents": number }]
`;

  const raw = await runTinyFish({ url: MOCK_PORTAL_URL, goal, browser_profile: "lite" });

  if (!Array.isArray(raw)) {
    throw new Error(`scrapeOutcomes: unexpected response shape: ${JSON.stringify(raw)}`);
  }

  return (raw as Array<Record<string, unknown>>).map((row) => {
    const outcome = row["outcome"] as string;
    return {
      candidateId: String(row["candidateId"] ?? row["dispute_id"] ?? ""),
      outcome: (outcome === "approved" || outcome === "denied" ? outcome : "pending") as
        | "approved"
        | "denied"
        | "pending",
      refundedCents: Number(row["refundedCents"] ?? row["refunded_cents"] ?? 0),
    };
  });
}
