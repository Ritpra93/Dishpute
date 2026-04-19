import type { EarlyWarning } from "@/lib/types";

const now = Date.now();
const ISO = (offsetMin: number) =>
  new Date(now + offsetMin * 60_000).toISOString();

export const FIXTURE_WARNINGS: EarlyWarning[] = [
  {
    id: "warn_001",
    candidateId: "warn_disp_001",
    orderId: "ord_dd_pending_021",
    platform: "doordash",
    severity: "imminent",
    category: "auto_refund_imminent",
    title: "DoorDash auto-refund window closes in 38 min",
    detail:
      "Customer marked items missing. DoorDash will auto-refund $24.50 unless Counter files a counter-defense within 38 minutes.",
    expectedAt: ISO(38),
    potentialChargeCents: 2450,
    artifactIds: ["disp_001"],
    createdAt: ISO(-5),
  },
  {
    id: "warn_002",
    candidateId: "warn_disp_002",
    orderId: "ord_ue_pending_044",
    platform: "ubereats",
    severity: "imminent",
    category: "delivery_timeout",
    title: "Uber Eats: order overdue by 45 min",
    detail:
      "Driver has been idle near Hennepin Ave for 18 minutes. Cold-food charge is statistically likely (62% historical conversion).",
    expectedAt: ISO(15),
    potentialChargeCents: 3200,
    createdAt: ISO(-9),
  },
  {
    id: "warn_003",
    candidateId: "warn_disp_003",
    orderId: "ord_gh_pending_018",
    platform: "grubhub",
    severity: "watch",
    category: "missing_item_pattern",
    title: "Grubhub: 3rd biryani-missing complaint today",
    detail:
      "Three customers in 4 hours flagged biryani missing. Counter staged evidence for the next two pending orders proactively.",
    expectedAt: ISO(120),
    potentialChargeCents: 1900,
    createdAt: ISO(-22),
  },
  {
    id: "warn_004",
    candidateId: "warn_disp_004",
    orderId: "ord_dd_pending_087",
    platform: "doordash",
    severity: "watch",
    category: "address_mismatch",
    title: "DoorDash: address mismatch on order #00487",
    detail:
      "Customer-entered address doesn't match Google Maps geocoding (off by 0.4 mi). Drivers historically mark this as not-delivered.",
    expectedAt: ISO(60),
    potentialChargeCents: 1850,
    createdAt: ISO(-35),
  },
  {
    id: "warn_005",
    candidateId: "warn_disp_005",
    orderId: "ord_ue_pending_099",
    platform: "ubereats",
    severity: "info",
    category: "review_swarm",
    title: "Uber Eats: 2 negative reviews in last hour",
    detail:
      "Two 1-star reviews referencing 'cold' and 'late'. Counter is monitoring the next 4 deliveries for related charges.",
    expectedAt: ISO(180),
    potentialChargeCents: 0,
    createdAt: ISO(-45),
  },
];
