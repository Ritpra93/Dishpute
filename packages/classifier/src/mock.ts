import type { ClassifiedDispute, DisputeCandidate, ErrorChargeType } from '@counter/types';

/**
 * Hand-tuned mock classifier seeds — the source of truth for the demo's
 * headline numbers:
 *   - 22 high-merit disputes (meritScore >= 70, shouldDispute: true)
 *   - 4 medium-merit (40-69, shouldDispute: true) — human review tier
 *   - 4 low (shouldDispute: false)
 *   - Sum of recoverableCents on the 22 high-merit = 89,200 cents = $892
 *
 * Demo script (docs/DEMO_SCRIPT.md) quotes "$892 recovered" explicitly.
 * The runtime assertion at the bottom of this file is a tripwire: if anyone
 * edits these seeds and drifts off the number, import fails loudly.
 */

interface ClassificationSeed {
  shouldDispute: boolean;
  meritScore: number;
  reasoning: string;
  resolvedChargeType?: ErrorChargeType;
  recoverableCents: number;
  draftedDisputeText: string;
  evidenceCitations: string[];
}

const SEEDS: Record<string, ClassificationSeed> = {
  // ─── 22 HIGH MERIT (meritScore >= 70, shouldDispute true) ───────────────
  disp_0001: {
    shouldDispute: true,
    meritScore: 89,
    reasoning:
      "Customer claims one of two dosas missing plus a lassi. POS shows both dosas and the lassi were rung up and the kitchen camera confirms a 4-item bag at pickup at 19:42.",
    recoverableCents: 5390,
    draftedDisputeText:
      "Order 4472 was packed with two Masala Dosas and one Mango Lassi as ordered — the kitchen pickup photo from 19:42 shows all four containers in the bag handed to the driver. The customer's missing-item claim is not supported by our prep record. Please reverse this $47.80 charge.",
    evidenceCitations: [
      "POS record for order 4472 lists 2× Masala Dosa, 1× Mango Lassi",
      "Kitchen camera frame at 19:42 shows 4-container bag at pickup",
    ],
  },
  disp_0002: {
    shouldDispute: true,
    meritScore: 76,
    reasoning:
      "Single-item missing claim on a $9 vada. Driver pickup log shows on-time handoff and POS shows item was prepared.",
    recoverableCents: 2120,
    draftedDisputeText:
      "Order 4488 included Medu Vada in the prep ticket and our line camera shows the item being plated at 18:21. Driver picked up the bag at 18:34 with no redelivery requests. We're requesting reversal of this $18.20 charge based on the prep record.",
    evidenceCitations: [
      "Prep ticket for order 4488 timestamped 18:21",
      "Driver accepted at 18:34, no callback",
    ],
  },
  disp_0003: {
    shouldDispute: true,
    meritScore: 81,
    reasoning:
      "Idli sambar and 2 naans claimed missing without a customer comment. POS shows full order packed; no pattern of complaints from this customer.",
    recoverableCents: 3350,
    draftedDisputeText:
      "Order 4501 contained Idli Sambar and two Garlic Naan per the POS record, all confirmed bagged by the line cook at 20:08. With no customer note describing the alleged missing items and a clean prep log, we're disputing this $29.50 charge.",
    evidenceCitations: [
      "POS record for order 4501 lists all three items",
      "Bag check log entry at 20:08",
    ],
  },
  disp_0004: {
    shouldDispute: true,
    meritScore: 92,
    reasoning:
      "Customer claims half the order missing — biryani, paneer, and naans. POS and kitchen photo show a full $56 multi-container handoff, contradicting the claim.",
    recoverableCents: 6380,
    draftedDisputeText:
      "Order 4517 was a 5-container bag at pickup at 19:33 — the kitchen camera frame shows the chicken biryani, paneer butter masala, and butter naans all packed and tied. The customer's claim that half the order was missing is inconsistent with our pickup photo. Please review and reverse the $56.80 charge.",
    evidenceCitations: [
      "Kitchen pickup photo at 19:33 shows 5 containers tied in bag",
      "POS receipt for order 4517 totals $56 across all 4 dishes",
    ],
  },
  disp_0005: {
    shouldDispute: true,
    meritScore: 71,
    reasoning:
      "Small $13 charge for missing 2-piece gulab jamun. No customer note. Item appears in POS and was likely included.",
    recoverableCents: 1490,
    draftedDisputeText:
      "Order 4525 included Gulab Jamun in the dessert add-on slot per the POS record. The dessert was confirmed plated and bagged at 21:14 by the closing cook. We dispute this $12.90 charge for an item that left the kitchen as part of the order.",
    evidenceCitations: [
      "POS shows Gulab Jamun added at order line 3",
      "Bag check at 21:14 confirms dessert container",
    ],
  },
  disp_0006: {
    shouldDispute: true,
    meritScore: 84,
    reasoning:
      "Whole biryani claimed missing on a $42 order. Specific claim but POS prep record shows the entree was made; biryani containers are large and rarely overlooked at pickup.",
    recoverableCents: 4800,
    draftedDisputeText:
      "Order 4539 had a Hyderabadi Biryani as the main entree, prepped at 20:07 and visible in the kitchen pickup photo at 20:21. A 32-oz biryani container is not the kind of item that goes missing at handoff. We're requesting reversal of $42.50 based on the prep and pickup record.",
    evidenceCitations: [
      "Prep ticket for order 4539 marks biryani complete at 20:07",
      "Pickup photo at 20:21 shows large entree container in bag",
    ],
  },
  disp_0007: {
    shouldDispute: true,
    meritScore: 73,
    reasoning:
      "Single dosa claimed missing on a $21 order with no customer explanation. POS shows item in prep queue.",
    recoverableCents: 2410,
    draftedDisputeText:
      "Order 4548 was a single Plain Dosa with no add-ons; the POS record shows it was prepped and bagged at 12:33. The driver collected the bag at 12:38 with no redelivery flag. We dispute this $21.10 charge.",
    evidenceCitations: [
      "POS prep stamp for order 4548 at 12:33",
      "Driver pickup at 12:38, no callback",
    ],
  },
  disp_0008: {
    shouldDispute: true,
    meritScore: 87,
    reasoning:
      "Customer comment cites missing chai 'third time this month' — pattern flag. Drinks rarely go missing from a sealed bag and POS shows both chais on the ticket.",
    recoverableCents: 3920,
    draftedDisputeText:
      "Order 4561 included two Masala Chai cups packed in the side compartment, confirmed by the bag check at 18:54. The customer cites a recurring missing-drinks pattern, but our pickup record contradicts that for this order. Requesting reversal of $34.70.",
    evidenceCitations: [
      "POS record for order 4561 lists 2× Masala Chai",
      "Bag check log at 18:54 with side-compartment note",
      "Customer history flag: 4 missing-item claims in 30 days",
    ],
  },
  disp_0009: {
    shouldDispute: true,
    meritScore: 72,
    reasoning:
      "Idli (3 pcs) claimed missing on a small $16 order. Lunch shift, low complaint volume, prep record clean.",
    recoverableCents: 1890,
    draftedDisputeText:
      "Order 4577 was a single Idli (3 pcs) prepared at 11:14 and handed to the driver at 11:22. The order has no add-ons, making a missing-item claim difficult to substantiate. We dispute this $16.40 charge.",
    evidenceCitations: [
      "Prep ticket for order 4577 timestamped 11:14",
      "Driver pickup at 11:22",
    ],
  },
  disp_0010: {
    shouldDispute: true,
    meritScore: 75,
    reasoning:
      "Onion uttapam and lassi missing claim on a $28 order. POS shows both items; no customer comment to evaluate further.",
    recoverableCents: 3240,
    draftedDisputeText:
      "Order 4589 contained an Onion Uttapam and a Mango Lassi per the POS record. Both were confirmed bagged at 13:09 by the line lead. Without a customer note explaining the missing items, the prep record stands. Requesting reversal of $28.40.",
    evidenceCitations: [
      "POS shows both items on order 4589",
      "Bag check at 13:09 by line lead",
    ],
  },
  disp_0011: {
    shouldDispute: true,
    meritScore: 91,
    reasoning:
      "Largest claim of the batch — 2 biryanis and dal supposedly missing on a $78 order. POS and pickup photo both show all containers.",
    recoverableCents: 9420,
    draftedDisputeText:
      "Order 4603 was packed in two bags at pickup at 19:48 — the kitchen photo shows both Chicken Biryani containers and the Dal Makhani container clearly. The customer's claim that the biryanis and dal were all missing is not supported by the prep ticket or the visual record. Please reverse the $78.20 charge.",
    evidenceCitations: [
      "Pickup photo at 19:48 shows 2 bags, 5 containers total",
      "POS record for order 4603 lists 2× Chicken Biryani, 1× Dal Makhani",
    ],
  },
  disp_0012: {
    shouldDispute: true,
    meritScore: 70,
    reasoning:
      "Small $9.80 charge for 2 missing naans. Likely legitimate to dispute given low cost vs. merit threshold.",
    recoverableCents: 1130,
    draftedDisputeText:
      "Order 4612 included two Garlic Naan, both prepared and bagged at 18:42. Naans are wrapped together in a foil packet and tracked as a single bag-check item. We dispute this $9.80 charge based on the prep log.",
    evidenceCitations: [
      "Naan packet logged at 18:42",
      "POS record for order 4612 lists 2× Garlic Naan",
    ],
  },
  disp_0013: {
    shouldDispute: true,
    meritScore: 79,
    reasoning:
      "Paneer tikka missing claim, $31 order. Specific item, POS shows prep, no other complaints from this address recently.",
    recoverableCents: 3520,
    draftedDisputeText:
      "Order 4624 had a Paneer Tikka entree prepped at 19:18 and confirmed in the bag at 19:26. The accompanying garlic naans were not flagged, and the tikka container is not visually similar to anything else in the order. We dispute this $31.20 charge.",
    evidenceCitations: [
      "Prep ticket for order 4624 at 19:18",
      "Bag check at 19:26 confirms tikka container",
    ],
  },
  disp_0015: {
    shouldDispute: true,
    meritScore: 74,
    reasoning:
      "Veg biryani and kheer missing on a $35 order. Kheer is a common skip but POS shows it on the ticket.",
    recoverableCents: 3960,
    draftedDisputeText:
      "Order 4655 included Veg Biryani and Kheer dessert per the POS receipt. Both items were prepared and packed at 12:21 — the kheer was added in a sealed cup with the entree. No driver callback was recorded. Requesting reversal of $35.10.",
    evidenceCitations: [
      "POS shows both items on order 4655",
      "Prep stamp at 12:21",
    ],
  },
  disp_0016: {
    shouldDispute: true,
    meritScore: 82,
    reasoning:
      "Wrong-item claim: customer says they got plain instead of mysore masala. Kitchen photo shows the correct mysore masala dosa being plated.",
    resolvedChargeType: "wrong_item",
    recoverableCents: 4180,
    draftedDisputeText:
      "Order 4663 was prepared as Mysore Masala Dosa — the kitchen camera at 13:09 shows the red chutney spread on the dosa, which is the visual signature of the mysore preparation. The plain dosa claim doesn't match what left our kitchen. We dispute this $36.80 charge.",
    evidenceCitations: [
      "Kitchen camera at 13:09 shows mysore-style red chutney spread",
      "POS prep ticket specifies Mysore Masala Dosa",
    ],
  },
  disp_0017: {
    shouldDispute: true,
    meritScore: 88,
    reasoning:
      "Customer claims veg biryani sent instead of chicken. Two distinct labeled containers; mix-up is unlikely. Pattern: this customer has flagged 3 wrong-item claims in 60 days.",
    resolvedChargeType: "wrong_item",
    recoverableCents: 5870,
    draftedDisputeText:
      "Order 4671 was packed with Chicken Biryani in a labeled non-veg container and Paneer Butter Masala in a labeled veg container — both containers carry colored stickers (red for non-veg, green for veg) per our SOP. A swap is not consistent with our packing process. Please review the $49.20 charge.",
    evidenceCitations: [
      "SOP-required color sticker on labeled non-veg container",
      "POS record for order 4671 lists Chicken Biryani as primary",
      "Customer history: 3 wrong-item claims in 60 days",
    ],
  },
  disp_0018: {
    shouldDispute: true,
    meritScore: 71,
    reasoning:
      "Wrong-item claim on a single uttapam, no customer note. Lower merit but still defensible based on prep record.",
    resolvedChargeType: "wrong_item",
    recoverableCents: 1980,
    draftedDisputeText:
      "Order 4684 was prepared as Onion Uttapam per the POS ticket, with diced onion topping confirmed visually at 18:34. Without a customer note describing what was received instead, the prep record is the controlling evidence. We dispute this $17.30 charge.",
    evidenceCitations: [
      "POS ticket for order 4684 specifies Onion Uttapam",
      "Visual confirmation at 18:34",
    ],
  },
  disp_0019: {
    shouldDispute: true,
    meritScore: 78,
    reasoning:
      "Customer says got chana masala when they ordered aloo gobi. Both are similar-color brown curries; unusual but plausible swap. POS and label confirm aloo gobi was made.",
    resolvedChargeType: "wrong_item",
    recoverableCents: 3240,
    draftedDisputeText:
      "Order 4699 was prepared as Aloo Gobi — the dish carries diced potato and cauliflower visible in the prep camera at 19:11, which is visually distinct from chana masala (chickpeas). The container was labeled correctly per SOP. We dispute this $28.40 charge.",
    evidenceCitations: [
      "Prep camera at 19:11 shows Aloo Gobi composition",
      "Container label per SOP",
    ],
  },
  disp_0020: {
    shouldDispute: true,
    meritScore: 73,
    reasoning:
      "Hyderabadi biryani wrong-item claim on a $32 order. No customer note specifying what was received instead.",
    resolvedChargeType: "wrong_item",
    recoverableCents: 3660,
    draftedDisputeText:
      "Order 4711 was prepped as Hyderabadi Biryani, signed off by the entree cook at 20:14. The customer comment field is empty so there's no description of what arrived instead, and our prep log is clear. Requesting reversal of $32.10.",
    evidenceCitations: [
      "Entree cook sign-off at 20:14",
      "POS specifies Hyderabadi Biryani for order 4711",
    ],
  },
  disp_0021: {
    shouldDispute: true,
    meritScore: 85,
    reasoning:
      "Customer claims whole order swapped. This actually points at a driver-side bag mix-up, not a kitchen error — refund should not come from merchant.",
    resolvedChargeType: "wrong_item",
    recoverableCents: 6320,
    draftedDisputeText:
      "Order 4727 was packed correctly per our prep ticket — Paneer Tikka, Dal Makhani, and two Butter Naans, all confirmed in the bag at 19:09. If the customer received a different order entirely, that's consistent with a driver-side bag swap rather than a kitchen error. Charges for that scenario should be assessed against the delivery handoff, not the merchant. Please reverse this $54.00 charge.",
    evidenceCitations: [
      "Prep ticket for order 4727 lists all 4 items",
      "Bag check at 19:09 confirms order composition",
      "Driver picked up multiple orders in same window",
    ],
  },
  disp_0023: {
    shouldDispute: true,
    meritScore: 76,
    reasoning:
      "Cold biryani claim citing 90-min wait. Driver log shows pickup at 22:14 and delivery at 22:51 — 37 min, well within window. Customer claim of 90 min is inaccurate.",
    resolvedChargeType: "cold_food",
    recoverableCents: 3290,
    draftedDisputeText:
      "Order 4744 left our kitchen at 22:14 and was marked delivered at 22:51 — a 37-minute delivery window, not 90 minutes as the customer reported. Our biryani is packed in insulated containers and arrives hot at this delivery time. The cold-food claim does not match the driver log. Please reverse the $28.90 charge.",
    evidenceCitations: [
      "Driver pickup at 22:14, delivered at 22:51 (37 min)",
      "Insulated entree container per SOP",
    ],
  },
  disp_0026: {
    shouldDispute: true,
    meritScore: 90,
    reasoning:
      "Order-never-arrived claim with specific apartment number. Driver marked delivered. This is a delivery dispute, not a merchant kitchen issue — refund liability is on the platform, not us.",
    resolvedChargeType: "order_never_arrived",
    recoverableCents: 7640,
    draftedDisputeText:
      "Order 4778 left our kitchen at 19:14 and was picked up by the driver at 19:21 in good condition — a 3-container bag with the customer's name on the label. The driver marked the order delivered at 19:48. If the customer reports never receiving it, that's a driver-side delivery failure that the merchant did not cause and should not be charged for. Please reassign this $62.40 charge.",
    evidenceCitations: [
      "Pickup at 19:21 with labeled 3-container bag",
      "Driver marked delivered at 19:48",
      "No redelivery or re-pickup requested",
    ],
  },

  // ─── 4 MEDIUM (40-69, shouldDispute true, human-review tier) ────────────
  disp_0014: {
    shouldDispute: true,
    meritScore: 55,
    reasoning:
      "Single-item missing claim with no customer comment, smaller $23 amount. Defensible but not strong enough to auto-submit.",
    recoverableCents: 1500,
    draftedDisputeText:
      "Order 4638 included Gobi Manchurian per the POS record. With no customer comment explaining the alleged missing item, the merit of this dispute is moderate; we recommend human review before submitting.",
    evidenceCitations: [
      "POS record for order 4638 lists Gobi Manchurian",
    ],
  },
  disp_0022: {
    shouldDispute: true,
    meritScore: 50,
    reasoning:
      "Cold-food complaint with vague language ('cold and old'). Borderline — customer could be right; recommend human review.",
    resolvedChargeType: "cold_food",
    recoverableCents: 1800,
    draftedDisputeText:
      "Order 4738 was delivered within 38 minutes of pickup — within our standard window, though on the longer side for South Indian items that lose heat quickly. The customer's note is vague but the timing is borderline. Recommend human review before disputing.",
    evidenceCitations: [
      "Driver delivered 38 min after pickup",
    ],
  },
  disp_0027: {
    shouldDispute: true,
    meritScore: 60,
    reasoning:
      "Customer says order never arrived and couldn't reach driver. Driver log shows delivery marked but no GPS confirmation. Mid-merit — possible legitimate delivery failure.",
    resolvedChargeType: "order_never_arrived",
    recoverableCents: 2400,
    draftedDisputeText:
      "Order 4791 was picked up at 20:11 and marked delivered at 20:39, but the customer reports the order never arrived and the driver was unreachable. Without GPS confirmation of the delivery point, the merchant should not be charged. Recommend human review for partial dispute.",
    evidenceCitations: [
      "Driver pickup at 20:11",
      "No GPS delivery confirmation",
    ],
  },
  disp_0028: {
    shouldDispute: true,
    meritScore: 55,
    reasoning:
      "Order-never-arrived claim with no customer note. Driver log is incomplete. Medium merit.",
    resolvedChargeType: "order_never_arrived",
    recoverableCents: 1800,
    draftedDisputeText:
      "Order 4806 was picked up at 19:32 with a 2-container bag confirmed. Delivery confirmation is incomplete in the driver log. We recommend partial dispute pending human review.",
    evidenceCitations: [
      "Pickup confirmed at 19:32",
      "Incomplete delivery log",
    ],
  },

  // ─── 4 LOW (shouldDispute false) ───────────────────────────────────────
  disp_0024: {
    shouldDispute: false,
    meritScore: 25,
    reasoning:
      "Vague customer comment ('everything was bad') with no specific defect cited. Quality complaints without specifics rarely win disputes.",
    resolvedChargeType: "cold_food",
    recoverableCents: 0,
    draftedDisputeText:
      "Recommend acceptance — the customer's complaint is generic and does not cite a specific defect that we can rebut with prep records.",
    evidenceCitations: ["No specific defect cited; not recommended for dispute"],
  },
  disp_0025: {
    shouldDispute: false,
    meritScore: 30,
    reasoning:
      "Cold-food complaint with no customer comment and no driver delay evidence in our favor. Subjective quality complaint — likely valid.",
    resolvedChargeType: "cold_food",
    recoverableCents: 0,
    draftedDisputeText:
      "Recommend acceptance — without a customer description or contradicting driver-log evidence, a cold-food complaint on Indian curries is difficult to rebut.",
    evidenceCitations: ["Subjective quality claim, low rebuttal probability"],
  },
  disp_0029: {
    shouldDispute: false,
    meritScore: 10,
    reasoning:
      "Customer cancellation after prep is on the merchant per platform policy. The customer changed their mind — we incurred the food cost.",
    resolvedChargeType: "customer_cancel",
    recoverableCents: 0,
    draftedDisputeText:
      "Recommend acceptance — customer cancellations after prep are not disputable under the platform's stated policy.",
    evidenceCitations: ["Customer cancellation policy applies"],
  },
  disp_0030: {
    shouldDispute: false,
    meritScore: 15,
    reasoning:
      "Customer cancel with no reason given. Same policy bar as disp_0029.",
    resolvedChargeType: "customer_cancel",
    recoverableCents: 0,
    draftedDisputeText:
      "Recommend acceptance — customer cancellations after prep are not disputable under the platform's stated policy.",
    evidenceCitations: ["Customer cancellation policy applies"],
  },
};

const GENERATED_AT = '2026-04-18T10:00:00.000Z';

export function buildMockClassification(candidate: DisputeCandidate): ClassifiedDispute {
  const seed = SEEDS[candidate.id];
  if (!seed) {
    throw new Error(
      `mock-classifier: no seed for candidate ${candidate.id}. ` +
        'Fixture IDs and classifier seeds must stay in lockstep.',
    );
  }
  return {
    candidateId: candidate.id,
    shouldDispute: seed.shouldDispute,
    meritScore: seed.meritScore,
    reasoning: seed.reasoning,
    resolvedChargeType: seed.resolvedChargeType ?? candidate.chargeType,
    recoverableCents: seed.recoverableCents,
    draftedDisputeText: seed.draftedDisputeText,
    evidenceCitations: seed.evidenceCitations,
    generatedAt: GENERATED_AT,
  };
}

// ─── Demo-number guardrail ──────────────────────────────────────────────────
// If anyone edits the table above and breaks the $892 demo number, fail loud.
const HIGH_MERIT_TOTAL_CENTS = Object.values(SEEDS)
  .filter((s) => s.shouldDispute && s.meritScore >= 70)
  .reduce((sum, s) => sum + s.recoverableCents, 0);

const HIGH_MERIT_COUNT = Object.values(SEEDS).filter(
  (s) => s.shouldDispute && s.meritScore >= 70,
).length;

if (HIGH_MERIT_TOTAL_CENTS !== 89_200) {
  throw new Error(
    `mock-classifier demo-number drift: expected $892 (89200c) of recoverable on high-merit disputes, got $${(
      HIGH_MERIT_TOTAL_CENTS / 100
    ).toFixed(2)} (${HIGH_MERIT_TOTAL_CENTS}c). Update docs/DEMO_SCRIPT.md if this change is intentional.`,
  );
}

if (HIGH_MERIT_COUNT !== 22) {
  throw new Error(
    `mock-classifier high-merit count drift: expected 22, got ${HIGH_MERIT_COUNT}. Demo script says "22 / 22 submitted".`,
  );
}
