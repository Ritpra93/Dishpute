/**
 * Smaller fixture sets for the W1 UberEats + Grubhub mock portals.
 *
 * These are intentionally NOT in `fixtures.ts` (which is the immutable 30-row
 * DoorDash House-of-Curry seed every classifier and scraper test depends on).
 * Adding them here lets the W2 grid show three live "platforms" without
 * shifting any IDs the classifier mock keys against.
 *
 * IDs use the `disp_ue_NNNN` and `disp_gh_NNNN` namespaces so they never
 * collide with `disp_NNNN` (DoorDash).
 */

import type { DisputeCandidate, ErrorChargeType, Platform } from "./index";
import { DISPUTE_WINDOW_DAYS } from "./constants";

const NOW = new Date("2026-04-18T20:00:00-05:00");

function isoDaysAgo(days: number, hours = 19, minutes = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function deadline(charge: string): string {
  const d = new Date(charge);
  d.setDate(d.getDate() + DISPUTE_WINDOW_DAYS);
  return d.toISOString();
}

interface MiniSeed {
  id: string;
  orderId: string;
  chargeType: ErrorChargeType;
  chargeAmountCents: number;
  items: Array<{ name: string; quantity: number; refundAmountCents: number }>;
  customerComment?: string;
  daysAgo: number;
  hour: number;
}

function build(seed: MiniSeed, platform: Platform, basePath: string): DisputeCandidate {
  const orderTs = isoDaysAgo(seed.daysAgo, seed.hour, 28);
  const chargeTs = isoDaysAgo(seed.daysAgo, seed.hour + 1, 11);
  const itemsLine = seed.items
    .map((i) => `${i.quantity}× ${i.name}`)
    .join(", ");
  const candidate: DisputeCandidate = {
    id: seed.id,
    platform,
    orderId: seed.orderId,
    chargeType: seed.chargeType,
    chargeAmountCents: seed.chargeAmountCents,
    itemsReported: seed.items,
    orderTimestamp: orderTs,
    chargeTimestamp: chargeTs,
    disputeDeadline: deadline(chargeTs),
    portalUrl: `${basePath}/${seed.id}`,
    rawText: `${platform} error charge ${seed.id}\nOrder ${seed.orderId}\nCharge type: ${seed.chargeType}\nItems: ${itemsLine}\n${seed.customerComment ? `Customer note: "${seed.customerComment}"` : "Customer note: (none)"}`,
  };
  if (seed.customerComment !== undefined) candidate.customerComment = seed.customerComment;
  return candidate;
}

const UBEREATS_SEEDS: MiniSeed[] = [
  {
    id: "disp_ue_0001",
    orderId: "ord_ue_8821",
    chargeType: "missing_item",
    chargeAmountCents: 3640,
    items: [
      { name: "Paneer Tikka Roll", quantity: 2, refundAmountCents: 2400 },
    ],
    customerComment: "Only got one roll, paid for two.",
    daysAgo: 2,
    hour: 19,
  },
  {
    id: "disp_ue_0002",
    orderId: "ord_ue_8843",
    chargeType: "wrong_item",
    chargeAmountCents: 2890,
    items: [{ name: "Chicken 65", quantity: 1, refundAmountCents: 1700 }],
    customerComment: "I ordered chicken 65, got plain chicken curry.",
    daysAgo: 3,
    hour: 20,
  },
  {
    id: "disp_ue_0003",
    orderId: "ord_ue_8861",
    chargeType: "cold_food",
    chargeAmountCents: 1990,
    items: [{ name: "Tandoori Wrap", quantity: 1, refundAmountCents: 1200 }],
    daysAgo: 4,
    hour: 21,
  },
  {
    id: "disp_ue_0004",
    orderId: "ord_ue_8879",
    chargeType: "order_never_arrived",
    chargeAmountCents: 5410,
    items: [
      { name: "Family Biryani Combo", quantity: 1, refundAmountCents: 3200 },
    ],
    customerComment: "Driver took photo of wrong door.",
    daysAgo: 5,
    hour: 19,
  },
];

const GRUBHUB_SEEDS: MiniSeed[] = [
  {
    id: "disp_gh_0001",
    orderId: "ord_gh_5512",
    chargeType: "missing_item",
    chargeAmountCents: 2350,
    items: [
      { name: "Mango Lassi", quantity: 2, refundAmountCents: 1000 },
    ],
    customerComment: "No drinks in the bag.",
    daysAgo: 1,
    hour: 18,
  },
  {
    id: "disp_gh_0002",
    orderId: "ord_gh_5527",
    chargeType: "wrong_item",
    chargeAmountCents: 4180,
    items: [{ name: "Veg Thali", quantity: 1, refundAmountCents: 2400 }],
    daysAgo: 2,
    hour: 13,
  },
  {
    id: "disp_gh_0003",
    orderId: "ord_gh_5544",
    chargeType: "missing_item",
    chargeAmountCents: 1670,
    items: [{ name: "Garlic Naan", quantity: 3, refundAmountCents: 1500 }],
    customerComment: "Naans missing.",
    daysAgo: 3,
    hour: 19,
  },
];

export const FIXTURE_DISPUTES_UBEREATS: DisputeCandidate[] = UBEREATS_SEEDS.map(
  (s) => build(s, "ubereats", "/mock-portal-ubereats/disputes")
);

export const FIXTURE_DISPUTES_GRUBHUB: DisputeCandidate[] = GRUBHUB_SEEDS.map(
  (s) => build(s, "grubhub", "/mock-portal-grubhub/disputes")
);

/**
 * Baseline P&L numbers used by W9 to render the "before" card. Hand-tuned
 * for House of Curry; matches the demo narrative ($892 monthly recovered ≈
 * $10.7K annualised, ~3.5% of GMV).
 */
export const PNL_BASELINE = {
  monthlyGmvCents: 2_500_000, // $25K/mo
  /** What the platform error-charges took before Counter, monthly. */
  monthlyLeakCents: 124_300, // $1,243
  /** What was *actually* disputed by hand before Counter (most operators give up). */
  monthlyManualRecoveredCents: 8_400, // $84
  /** Hours the operator spent disputing per month. */
  monthlyManualHours: 6,
} as const;
