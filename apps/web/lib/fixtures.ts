/**
 * INLINED COPY OF @counter/types FIXTURE_DISPUTES
 *
 * MERGE NOTE: When @counter/types ships, replace this file with:
 *   export { FIXTURE_DISPUTES } from "@counter/types";
 *
 * The IDs (disp_0001 through disp_0030) are the canonical scheme that Workers 1
 * and 2 are also told to key off of (see apps/web/CLAUDE.md lines 113-132 and
 * packages/classifier/CLAUDE.md). Do not renumber.
 *
 * 30 disputes for House of Curry (3 Minneapolis locations). Distribution per
 * packages/types/CLAUDE.md Task 4:
 *   15 missing_item, 6 wrong_item, 4 cold_food, 3 order_never_arrived, 2 customer_cancel
 *
 * Total chargeAmountCents across all 30 ~ $1,242 (the demo number from
 * docs/DEMO_SCRIPT.md Beat 2).
 */

import type { DisputeCandidate, ErrorChargeType, Platform } from "./types";
import { DISPUTE_WINDOW_DAYS } from "./types";

const PLATFORM: Platform = "doordash";
const NOW = new Date("2026-04-18T20:00:00-05:00");

function isoDaysAgo(days: number, hours = 19, minutes = 0): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function disputeDeadline(chargeIso: string): string {
  const d = new Date(chargeIso);
  d.setDate(d.getDate() + DISPUTE_WINDOW_DAYS);
  return d.toISOString();
}

interface Seed {
  id: string;
  orderId: string;
  chargeType: ErrorChargeType;
  chargeAmountCents: number;
  items: Array<{ name: string; quantity: number; refundAmountCents: number }>;
  customerComment?: string;
  daysAgo: number;
  hour: number;
}

function seedToCandidate(s: Seed): DisputeCandidate {
  const orderTs = isoDaysAgo(s.daysAgo, s.hour, 28);
  const chargeTs = isoDaysAgo(s.daysAgo, s.hour + 1, 11);
  const itemsLine = s.items
    .map((i) => `${i.quantity}× ${i.name} ($${(i.refundAmountCents / 100).toFixed(2)})`)
    .join(", ");
  const rawText = [
    `DoorDash error charge case ${s.id}`,
    `Order ${s.orderId} placed ${orderTs}`,
    `Charge type: ${s.chargeType}`,
    `Items reported: ${itemsLine}`,
    s.customerComment ? `Customer note: "${s.customerComment}"` : "Customer note: (none)",
    `Auto-charged $${(s.chargeAmountCents / 100).toFixed(2)} on ${chargeTs}.`,
  ].join("\n");

  return {
    id: s.id,
    platform: PLATFORM,
    orderId: s.orderId,
    chargeType: s.chargeType,
    chargeAmountCents: s.chargeAmountCents,
    itemsReported: s.items,
    customerComment: s.customerComment,
    orderTimestamp: orderTs,
    chargeTimestamp: chargeTs,
    disputeDeadline: disputeDeadline(chargeTs),
    portalUrl: `/mock-portal/disputes/${s.id}`,
    rawText,
  };
}

const SEEDS: Seed[] = [
  // ─── 15 missing_item ─────────────────────────────────────────────────────
  {
    id: "disp_0001",
    orderId: "ord_4472",
    chargeType: "missing_item",
    chargeAmountCents: 4780,
    items: [
      { name: "Masala Dosa", quantity: 2, refundAmountCents: 2800 },
      { name: "Mango Lassi", quantity: 1, refundAmountCents: 500 },
    ],
    customerComment: "Got 1 dosa not 2. Lassi was missing.",
    daysAgo: 3,
    hour: 19,
  },
  {
    id: "disp_0002",
    orderId: "ord_4488",
    chargeType: "missing_item",
    chargeAmountCents: 1820,
    items: [{ name: "Medu Vada (4 pcs)", quantity: 1, refundAmountCents: 900 }],
    customerComment: "Vada wasn't in the bag.",
    daysAgo: 4,
    hour: 18,
  },
  {
    id: "disp_0003",
    orderId: "ord_4501",
    chargeType: "missing_item",
    chargeAmountCents: 2950,
    items: [
      { name: "Idli Sambar", quantity: 1, refundAmountCents: 1100 },
      { name: "Garlic Naan", quantity: 2, refundAmountCents: 1000 },
    ],
    daysAgo: 5,
    hour: 20,
  },
  {
    id: "disp_0004",
    orderId: "ord_4517",
    chargeType: "missing_item",
    chargeAmountCents: 5680,
    items: [
      { name: "Chicken Biryani", quantity: 1, refundAmountCents: 1800 },
      { name: "Paneer Butter Masala", quantity: 1, refundAmountCents: 1600 },
      { name: "Butter Naan", quantity: 2, refundAmountCents: 1000 },
    ],
    customerComment: "Half my order missing — biryani and paneer not delivered.",
    daysAgo: 6,
    hour: 19,
  },
  {
    id: "disp_0005",
    orderId: "ord_4525",
    chargeType: "missing_item",
    chargeAmountCents: 1290,
    items: [{ name: "Gulab Jamun (2 pcs)", quantity: 1, refundAmountCents: 600 }],
    daysAgo: 7,
    hour: 21,
  },
  {
    id: "disp_0006",
    orderId: "ord_4539",
    chargeType: "missing_item",
    chargeAmountCents: 4250,
    items: [
      { name: "Hyderabadi Biryani", quantity: 1, refundAmountCents: 1900 },
      { name: "Mango Lassi", quantity: 2, refundAmountCents: 1000 },
    ],
    customerComment: "Whole biryani missing.",
    daysAgo: 8,
    hour: 20,
  },
  {
    id: "disp_0007",
    orderId: "ord_4548",
    chargeType: "missing_item",
    chargeAmountCents: 2110,
    items: [{ name: "Plain Dosa", quantity: 1, refundAmountCents: 1100 }],
    daysAgo: 9,
    hour: 12,
  },
  {
    id: "disp_0008",
    orderId: "ord_4561",
    chargeType: "missing_item",
    chargeAmountCents: 3470,
    items: [
      { name: "Mysore Masala Dosa", quantity: 1, refundAmountCents: 1600 },
      { name: "Masala Chai", quantity: 2, refundAmountCents: 800 },
    ],
    customerComment: "Drinks missing again, third time this month.",
    daysAgo: 10,
    hour: 18,
  },
  {
    id: "disp_0009",
    orderId: "ord_4577",
    chargeType: "missing_item",
    chargeAmountCents: 1640,
    items: [{ name: "Idli (3 pcs)", quantity: 1, refundAmountCents: 900 }],
    daysAgo: 11,
    hour: 11,
  },
  {
    id: "disp_0010",
    orderId: "ord_4589",
    chargeType: "missing_item",
    chargeAmountCents: 2840,
    items: [
      { name: "Onion Uttapam", quantity: 1, refundAmountCents: 1400 },
      { name: "Mango Lassi", quantity: 1, refundAmountCents: 500 },
    ],
    daysAgo: 12,
    hour: 13,
  },
  {
    id: "disp_0011",
    orderId: "ord_4603",
    chargeType: "missing_item",
    chargeAmountCents: 7820,
    items: [
      { name: "Chicken Biryani", quantity: 2, refundAmountCents: 3600 },
      { name: "Dal Makhani", quantity: 1, refundAmountCents: 1400 },
    ],
    customerComment: "Order was incomplete, missing biryanis and dal.",
    daysAgo: 12,
    hour: 19,
  },
  {
    id: "disp_0012",
    orderId: "ord_4612",
    chargeType: "missing_item",
    chargeAmountCents: 980,
    items: [{ name: "Garlic Naan", quantity: 2, refundAmountCents: 1000 }],
    daysAgo: 1,
    hour: 18,
  },
  {
    id: "disp_0013",
    orderId: "ord_4624",
    chargeType: "missing_item",
    chargeAmountCents: 3120,
    items: [
      { name: "Paneer Tikka", quantity: 1, refundAmountCents: 1700 },
      { name: "Garlic Naan", quantity: 2, refundAmountCents: 1000 },
    ],
    customerComment: "Paneer tikka not in bag.",
    daysAgo: 2,
    hour: 19,
  },
  {
    id: "disp_0014",
    orderId: "ord_4638",
    chargeType: "missing_item",
    chargeAmountCents: 2270,
    items: [{ name: "Gobi Manchurian", quantity: 1, refundAmountCents: 1400 }],
    daysAgo: 13,
    hour: 18,
  },
  {
    id: "disp_0015",
    orderId: "ord_4655",
    chargeType: "missing_item",
    chargeAmountCents: 3510,
    items: [
      { name: "Veg Biryani", quantity: 1, refundAmountCents: 1500 },
      { name: "Kheer", quantity: 1, refundAmountCents: 700 },
    ],
    daysAgo: 13,
    hour: 12,
  },

  // ─── 6 wrong_item ────────────────────────────────────────────────────────
  {
    id: "disp_0016",
    orderId: "ord_4663",
    chargeType: "wrong_item",
    chargeAmountCents: 3680,
    items: [{ name: "Mysore Masala Dosa", quantity: 1, refundAmountCents: 1600 }],
    customerComment: "Got plain dosa instead of mysore masala.",
    daysAgo: 4,
    hour: 13,
  },
  {
    id: "disp_0017",
    orderId: "ord_4671",
    chargeType: "wrong_item",
    chargeAmountCents: 4920,
    items: [
      { name: "Chicken Biryani", quantity: 1, refundAmountCents: 1800 },
      { name: "Paneer Butter Masala", quantity: 1, refundAmountCents: 1600 },
    ],
    customerComment: "Sent veg biryani instead of chicken.",
    daysAgo: 6,
    hour: 20,
  },
  {
    id: "disp_0018",
    orderId: "ord_4684",
    chargeType: "wrong_item",
    chargeAmountCents: 1730,
    items: [{ name: "Onion Uttapam", quantity: 1, refundAmountCents: 1400 }],
    daysAgo: 8,
    hour: 18,
  },
  {
    id: "disp_0019",
    orderId: "ord_4699",
    chargeType: "wrong_item",
    chargeAmountCents: 2840,
    items: [
      { name: "Aloo Gobi", quantity: 1, refundAmountCents: 1300 },
      { name: "Garlic Naan", quantity: 2, refundAmountCents: 1000 },
    ],
    customerComment: "Got chana masala when I ordered aloo gobi.",
    daysAgo: 10,
    hour: 19,
  },
  {
    id: "disp_0020",
    orderId: "ord_4711",
    chargeType: "wrong_item",
    chargeAmountCents: 3210,
    items: [{ name: "Hyderabadi Biryani", quantity: 1, refundAmountCents: 1900 }],
    daysAgo: 11,
    hour: 20,
  },
  {
    id: "disp_0021",
    orderId: "ord_4727",
    chargeType: "wrong_item",
    chargeAmountCents: 5400,
    items: [
      { name: "Paneer Tikka", quantity: 1, refundAmountCents: 1700 },
      { name: "Dal Makhani", quantity: 1, refundAmountCents: 1400 },
      { name: "Butter Naan", quantity: 2, refundAmountCents: 1000 },
    ],
    customerComment: "Whole order was wrong — got someone else's bag.",
    daysAgo: 5,
    hour: 19,
  },

  // ─── 4 cold_food ─────────────────────────────────────────────────────────
  {
    id: "disp_0022",
    orderId: "ord_4738",
    chargeType: "cold_food",
    chargeAmountCents: 4180,
    items: [
      { name: "Masala Dosa", quantity: 2, refundAmountCents: 2800 },
      { name: "Idli Sambar", quantity: 1, refundAmountCents: 1100 },
    ],
    customerComment: "Food was cold and old I want full refund",
    daysAgo: 7,
    hour: 21,
  },
  {
    id: "disp_0023",
    orderId: "ord_4744",
    chargeType: "cold_food",
    chargeAmountCents: 2890,
    items: [{ name: "Chicken Biryani", quantity: 1, refundAmountCents: 1800 }],
    customerComment: "Biryani arrived stone cold after 90 min wait.",
    daysAgo: 9,
    hour: 22,
  },
  {
    id: "disp_0024",
    orderId: "ord_4759",
    chargeType: "cold_food",
    chargeAmountCents: 1960,
    items: [{ name: "Rava Dosa", quantity: 1, refundAmountCents: 1300 }],
    customerComment: "everything was bad",
    daysAgo: 12,
    hour: 20,
  },
  {
    id: "disp_0025",
    orderId: "ord_4763",
    chargeType: "cold_food",
    chargeAmountCents: 3470,
    items: [
      { name: "Paneer Butter Masala", quantity: 1, refundAmountCents: 1600 },
      { name: "Butter Naan", quantity: 2, refundAmountCents: 1000 },
    ],
    daysAgo: 13,
    hour: 21,
  },

  // ─── 3 order_never_arrived ───────────────────────────────────────────────
  {
    id: "disp_0026",
    orderId: "ord_4778",
    chargeType: "order_never_arrived",
    chargeAmountCents: 6240,
    items: [
      { name: "Hyderabadi Biryani", quantity: 1, refundAmountCents: 1900 },
      { name: "Paneer Tikka", quantity: 1, refundAmountCents: 1700 },
      { name: "Gulab Jamun (2 pcs)", quantity: 2, refundAmountCents: 1200 },
    ],
    customerComment: "Driver marked delivered, never arrived. Apartment 4B.",
    daysAgo: 2,
    hour: 19,
  },
  {
    id: "disp_0027",
    orderId: "ord_4791",
    chargeType: "order_never_arrived",
    chargeAmountCents: 4830,
    items: [
      { name: "Chicken Biryani", quantity: 1, refundAmountCents: 1800 },
      { name: "Mango Lassi", quantity: 2, refundAmountCents: 1000 },
    ],
    customerComment: "Order never came. Tried calling driver, no answer.",
    daysAgo: 4,
    hour: 20,
  },
  {
    id: "disp_0028",
    orderId: "ord_4806",
    chargeType: "order_never_arrived",
    chargeAmountCents: 3590,
    items: [
      { name: "Gobi Manchurian", quantity: 1, refundAmountCents: 1400 },
      { name: "Veg Biryani", quantity: 1, refundAmountCents: 1500 },
    ],
    daysAgo: 6,
    hour: 19,
  },

  // ─── 2 customer_cancel ───────────────────────────────────────────────────
  {
    id: "disp_0029",
    orderId: "ord_4819",
    chargeType: "customer_cancel",
    chargeAmountCents: 2870,
    items: [
      { name: "Onion Uttapam", quantity: 1, refundAmountCents: 1400 },
      { name: "Masala Chai", quantity: 1, refundAmountCents: 400 },
    ],
    customerComment: "Changed my mind, want a refund.",
    daysAgo: 5,
    hour: 14,
  },
  {
    id: "disp_0030",
    orderId: "ord_4828",
    chargeType: "customer_cancel",
    chargeAmountCents: 4150,
    items: [
      { name: "Chicken Biryani", quantity: 1, refundAmountCents: 1800 },
      { name: "Garlic Naan", quantity: 2, refundAmountCents: 1000 },
    ],
    daysAgo: 8,
    hour: 19,
  },
];

export const FIXTURE_DISPUTES: DisputeCandidate[] = SEEDS.map(seedToCandidate);

if (FIXTURE_DISPUTES.length !== 30) {
  throw new Error(
    `FIXTURE_DISPUTES must contain exactly 30 records (got ${FIXTURE_DISPUTES.length}).`
  );
}
