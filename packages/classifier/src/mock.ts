import type { DisputeCandidate, ClassifiedDispute } from '@counter/types';

const GENERATED_AT = '2026-04-18T10:00:00.000Z';

// prettier-ignore
const MOCK_DATA: Record<string, Omit<ClassifiedDispute, 'candidateId' | 'generatedAt'>> = {
  'dc-001': {
    shouldDispute: true,
    meritScore: 88,
    reasoning: 'Customer comment is vague and non-specific. POS confirms 4 items dispatched at 6:47 PM; driver pickup 4 minutes later with no incomplete-order flag raised.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 5200,
    draftedDisputeText: 'Our POS log for order DD-128473 confirms both masala dosas and sambar vadas were prepared and included — the kitchen prints show four items dispatched at 6:47 PM, and the Dasher marked pickup at 6:51 PM with no short-order report. The customer\'s comment does not identify a specific missing item, making this claim unverifiable. We request reversal of the $52.00 charge.',
    evidenceCitations: [
      'POS record for DD-128473: 4 items dispatched at 6:47 PM CDT',
      'Dasher pickup confirmed at 6:51 PM — no incomplete-order flag',
    ],
  },
  'dc-002': {
    shouldDispute: true,
    meritScore: 82,
    reasoning: 'POS record confirms all 5 items dispatched at 7:15 PM. Customer has filed 3 similar claims in 60 days, a pattern consistent with serial abuse.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 3800,
    draftedDisputeText: 'POS for order DD-234891 shows 1× butter chicken, 2× garlic naan, and 2× raita printed and dispatched by 7:15 PM. Driver pickup was confirmed at 7:22 PM with no incomplete-order flag. This customer has filed three similar missing-item claims in the past 60 days, none previously disputed by the restaurant. Please reverse the $38.00 deduction.',
    evidenceCitations: [
      'POS record for DD-234891: 5 items dispatched at 7:15 PM CDT',
      'Customer refund history: 3 claims in 60 days',
      'Dasher pickup at 7:22 PM — no anomalies logged',
    ],
  },
  'dc-003': {
    shouldDispute: true,
    meritScore: 91,
    reasoning: 'Both biryanis were assembled on one ticket. Single-bag pickup with no discrepancy reported by Dasher. Customer claim is internally inconsistent.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 4400,
    draftedDisputeText: 'Both chicken biryani portions for order DD-341027 were assembled and sealed together — kitchen display shows a single combined ticket completed at 7:58 PM. The Dasher accepted the single bag at 8:03 PM, indicating the full order was handed off intact. We ask that the $44.00 charge be reversed.',
    evidenceCitations: [
      'KDS shows single ticket for DD-341027 completed at 7:58 PM CDT',
      'Dasher accepted one bag at 8:03 PM — no partial-order report',
    ],
  },
  'dc-004': {
    shouldDispute: true,
    meritScore: 78,
    reasoning: 'Original order ticket has no masala dosa — customer claims to have received an item that was never ordered. Kitchen cannot produce an unordered item.',
    resolvedChargeType: 'wrong_item',
    recoverableCents: 2800,
    draftedDisputeText: 'Order DD-412856 receipt shows uttapam, medu vada, and one filter coffee — masala dosa does not appear on the original ticket, which the customer claims was delivered instead. Our kitchen cannot prepare an item not on the order. Please review the original receipt and reverse the $28.00 charge.',
    evidenceCitations: [
      'Original ticket DD-412856 contains: uttapam, medu vada, filter coffee',
      'No masala dosa on any ticket for this time slot',
    ],
  },
  'dc-005': {
    shouldDispute: true,
    meritScore: 85,
    reasoning: 'Two-item order dispatched 7 minutes before driver pickup. No customer comment or photo. Claim filed 9 days post-delivery.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 2200,
    draftedDisputeText: 'Two idli sambar sets were printed to the kitchen at 6:12 PM for order DD-589234, with the Dasher completing pickup at 6:19 PM — a 7-minute window too short for an item to go missing post-dispatch. No comment or photo was provided by the customer, and the claim was submitted 9 days after delivery. We request the $22.00 charge be reversed.',
    evidenceCitations: [
      'POS for DD-589234: 2× idli sambar dispatched at 6:12 PM CDT',
      'Dasher pickup at 6:19 PM — no partial-order note',
      'Claim filed 9 days after delivery with no photo evidence',
    ],
  },
  'dc-006': {
    shouldDispute: true,
    meritScore: 93,
    reasoning: 'Customer cannot identify which item is missing. Full 4-item order sealed and dispatched; POS and driver log corroborate. Claim filed 11 days post-delivery.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 6000,
    draftedDisputeText: 'POS for order DD-672109 confirms all items — half tandoori chicken, lamb rogan josh, two garlic naan, and raita — dispatched in one sealed bag at 7:33 PM. The customer\'s complaint ("some items were missing but I can\'t remember which") contains no actionable detail and was filed 11 days after delivery. Reverse the $60.00 charge.',
    evidenceCitations: [
      'POS for DD-672109: 4-item order dispatched at 7:33 PM CDT',
      'Claim filed 11 days post-delivery — no specifics provided',
      'Dasher pickup confirmed at 7:41 PM',
    ],
  },
  'dc-007': {
    shouldDispute: true,
    meritScore: 80,
    reasoning: 'All three items are on one ticket. Dasher pickup 7 minutes after dispatch with no partial-order flag. Claim filed 8 days post-delivery.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 4200,
    draftedDisputeText: 'Palak paneer, dal makhani, and three naan for order DD-743820 were prepared on the same ticket and bagged together by 8:02 PM. Dasher pickup at 8:09 PM shows a complete handoff with no short-order flag. The customer\'s claim arrived 8 days post-delivery with no photo. Please reverse the $42.00 error charge.',
    evidenceCitations: [
      'Single ticket for DD-743820: all 3 items dispatched at 8:02 PM CDT',
      'Dasher pickup at 8:09 PM — no incomplete-order report',
      'Claim filed 8 days post-delivery',
    ],
  },
  'dc-008': {
    shouldDispute: true,
    meritScore: 76,
    reasoning: 'No customer comment; no redelivery request; no photo. Dasher delivery took 36 minutes — standard. Claim lacks any supporting detail.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 3500,
    draftedDisputeText: 'Order DD-854437 POS shows chole bhature, two mango lassis, and gulab jamun dispatched at 6:55 PM. Delivery was completed at 7:31 PM — a 36-minute window — with no customer photo, no redelivery request, and no Dasher partial-order note. We request the $35.00 charge be reversed.',
    evidenceCitations: [
      'POS for DD-854437: 4 items dispatched at 6:55 PM CDT',
      'Delivery confirmed at 7:31 PM (36 min) — no anomalies',
      'No customer photo or redelivery request filed',
    ],
  },
  'dc-009': {
    shouldDispute: true,
    meritScore: 83,
    reasoning: 'Customer\'s vague claim ("something completely different") contradicts the narrow menu — filter coffee has no comparable substitute. Original ticket leaves no ambiguity.',
    resolvedChargeType: 'wrong_item',
    recoverableCents: 1800,
    draftedDisputeText: 'Order DD-921643 receipt is unambiguous: one uttapam and one filter coffee. The customer claims they received "something completely different," but filter coffee is not interchangeable with any other menu item, and no substitution flag exists on the ticket. We dispute this $18.00 charge and request reversal.',
    evidenceCitations: [
      'Ticket DD-921643: uttapam + filter coffee only — no substitution flag',
      'Filter coffee has no like-for-like substitute on our menu',
    ],
  },
  'dc-010': {
    shouldDispute: true,
    meritScore: 77,
    reasoning: 'Non-specific comment ("I think one thing was missing") cannot support a charge. POS confirms full 3-item order dispatched with on-time delivery.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 3200,
    draftedDisputeText: 'POS for order DD-013752 confirms chole bhature, aloo paratha, and raita all completed at 7:21 PM. Dasher pickup at 7:27 PM with no anomalies logged. A customer comment of "I think one thing was missing" is insufficient to support a $32.00 deduction from the restaurant. Reverse the charge.',
    evidenceCitations: [
      'POS for DD-013752: 3 items dispatched at 7:21 PM CDT',
      'Dasher pickup at 7:27 PM — no short-order note',
    ],
  },
  'dc-011': {
    shouldDispute: true,
    meritScore: 89,
    reasoning: 'Both portions on one sealed ticket. Customer phrasing ("as usual") signals chronic abuse — 5 refund claims in 4 months. Strong grounds to contest.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 4800,
    draftedDisputeText: 'Both lamb rogan josh portions for order DD-104928 were plated and sealed at 8:14 PM; the Dasher picked up the full order at 8:19 PM. This customer has submitted five refund claims in four months — none previously disputed — and their comment ("as usual") signals a pattern. A $48.00 charge on a confirmed-complete order warrants reversal.',
    evidenceCitations: [
      'POS for DD-104928: 2× lamb rogan josh dispatched at 8:14 PM CDT',
      'Customer refund history: 5 claims in 120 days',
      'Dasher pickup at 8:19 PM — no partial-order flag',
    ],
  },
  'dc-012': {
    shouldDispute: true,
    meritScore: 74,
    reasoning: 'Delivery time was 19 minutes — well within tolerance. Gulab jamun is served at room temperature by design. Aloo paratha retains heat in sealed packaging.',
    resolvedChargeType: 'cold_food',
    recoverableCents: 2500,
    draftedDisputeText: 'Delivery time for order DD-218034 was 19 minutes (8:03 PM pickup, 8:22 PM delivery) — well inside our threshold for food to arrive at temperature. Aloo paratha retains heat in sealed foil packaging, and gulab jamun is served at room temperature by design. We contest the $25.00 cold-food charge.',
    evidenceCitations: [
      'Delivery log DD-218034: 19-minute transit (8:03→8:22 PM CDT)',
      'Gulab jamun is room-temperature by menu specification',
    ],
  },
  'dc-013': {
    shouldDispute: true,
    meritScore: 92,
    reasoning: 'Largest charge in queue. Three-item order confirmed dispatched on single ticket. Vague claim filed 12 days post-delivery with no specifics.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 7200,
    draftedDisputeText: 'Order DD-326741 — two fish curries and one mutton curry — was confirmed printed at 7:47 PM and handed off at 7:54 PM to the assigned Dasher. The customer reported "missing items" without specifying which, and the complaint arrived 12 days after delivery. Reverse the $72.00 charge immediately.',
    evidenceCitations: [
      'POS for DD-326741: 3-item order dispatched at 7:47 PM CDT',
      'Dasher pickup confirmed at 7:54 PM',
      'Claim filed 12 days post-delivery — no item specifics',
    ],
  },
  'dc-014': {
    shouldDispute: true,
    meritScore: 79,
    reasoning: 'Two-item order dispatched on one ticket; driver pickup 5 minutes later. Non-specific claim ("not everything was there") filed post-delivery.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 2000,
    draftedDisputeText: 'Both medu vada orders for DD-431856 left the kitchen at 6:28 PM on a single ticket. The Dasher confirmed pickup 5 minutes later. The customer\'s complaint — "not everything was there" — provides no specifics. We request the $20.00 charge be reversed.',
    evidenceCitations: [
      'POS for DD-431856: 2× medu vada dispatched at 6:28 PM CDT',
      'Dasher pickup at 6:33 PM — no partial-order note',
    ],
  },
  'dc-015': {
    shouldDispute: true,
    meritScore: 86,
    reasoning: 'Four-item order on single ticket, all confirmed dispatched. No comment or photo from customer; claim filed 10 days post-delivery.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 5000,
    draftedDisputeText: 'Our kitchen display system for order DD-548293 shows all four items — chicken 65, chicken biryani, mango lassi, and filter coffee — dispatched on a single ticket at 7:39 PM. Dasher pickup was at 7:46 PM. The customer\'s claim, filed 10 days later, does not identify which item was missing. Please reverse the $50.00 charge.',
    evidenceCitations: [
      'KDS for DD-548293: 4-item ticket dispatched at 7:39 PM CDT',
      'Dasher pickup at 7:46 PM — no short-order flag',
      'Claim filed 10 days post-delivery — no photo or specifics',
    ],
  },
  'dc-016': {
    shouldDispute: true,
    meritScore: 81,
    reasoning: 'Full order confirmed dispatched. Customer\'s sole complaint ("the bag felt light") is subjective and unverifiable.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 4500,
    draftedDisputeText: 'POS for order DD-629475 shows butter chicken, two rava idli sets, and raita all completed and bagged by 6:49 PM. Dasher pickup at 6:56 PM with no short-order report. The customer\'s comment — "the bag felt light" — is subjective and insufficient to support a $45.00 deduction. Reverse the charge.',
    evidenceCitations: [
      'POS for DD-629475: 4 items dispatched at 6:49 PM CDT',
      'Dasher pickup at 6:56 PM — no partial-order flag',
    ],
  },
  'dc-017': {
    shouldDispute: true,
    meritScore: 78,
    reasoning: 'POS shows both naans on the original ticket. Claim filed 7 days post-delivery — well within window but delayed. Customer specificity actually allows us to refute directly.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 4200,
    draftedDisputeText: 'Chicken tikka masala, two garlic naans, and two mango lassis for order DD-734820 were dispatched at 8:22 PM per our POS log. Delivery occurred at 8:58 PM (36 min — standard). The customer cited "missing naan," but our ticket shows both garlic naans were included. We request reversal of the $42.00 charge.',
    evidenceCitations: [
      'POS for DD-734820: 2× garlic naan confirmed on ticket, dispatched 8:22 PM CDT',
      'Delivery completed at 8:58 PM — standard transit time',
    ],
  },
  'dc-018': {
    shouldDispute: true,
    meritScore: 84,
    reasoning: 'Two dosas are inherently co-assembled. Single-item cook line, simultaneous dispatch — no mechanism exists for one to be omitted without the other.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 2800,
    draftedDisputeText: 'Two masala dosas for order DD-821639 were prepared on the same cook line, assembled simultaneously, and handed to the Dasher at 7:11 PM. On our line, two-dosa orders are always sealed in one container — there is no mechanism for one to be omitted without the other. Reverse the $28.00 charge.',
    evidenceCitations: [
      'POS for DD-821639: 2× masala dosa dispatched at 7:11 PM CDT',
      'Two-dosa orders sealed in single container per kitchen SOP',
    ],
  },
  'dc-019': {
    shouldDispute: true,
    meritScore: 87,
    reasoning: 'All items on one ticket. First-time customer filed 9 days post-delivery without photo. Pattern suggests opportunistic claim rather than genuine error.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 5000,
    draftedDisputeText: 'Paneer tikka, lamb rogan josh, and two naan for order DD-934027 were completed on the same ticket at 7:52 PM and sealed together. The Dasher picked up the bag without noting any discrepancy. The customer — placing their first order with us — filed this claim 9 days after delivery. We dispute the $50.00 charge.',
    evidenceCitations: [
      'Single ticket for DD-934027: all items dispatched at 7:52 PM CDT',
      'Dasher pickup — no partial-order note',
      'First-time customer; claim filed 9 days post-delivery',
    ],
  },
  'dc-020': {
    shouldDispute: true,
    meritScore: 75,
    reasoning: '24-minute delivery is within acceptable range. Chicken 65 retains heat well; filter coffee was in insulated packaging. Cold-food charge is not supported by delivery timing.',
    resolvedChargeType: 'cold_food',
    recoverableCents: 3500,
    draftedDisputeText: 'The Dasher for order DD-048312 logged delivery at 7:22 PM — 24 minutes after pickup at 6:58 PM — within our standard delivery window. Chicken 65 and uttapam hold temperature well in sealed packaging; the filter coffee was in an insulated cup. We contest the $35.00 cold-food charge.',
    evidenceCitations: [
      'Delivery log DD-048312: 24-minute transit (6:58→7:22 PM CDT)',
      'Chicken 65 retains heat; filter coffee packaged in insulated cup',
    ],
  },
  'dc-021': {
    shouldDispute: true,
    meritScore: 82,
    reasoning: 'Delivery photo in platform log shows full bag; no redelivery request. Non-specific claim without any follow-up.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 3000,
    draftedDisputeText: 'Our POS log for order DD-156483 confirms two sambar vada servings and one mango lassi dispatched at 6:33 PM. The Dasher\'s delivery photo (visible in platform log) shows a full bag; no redelivery request was made. The customer offered only "something was missing." Reverse the $30.00 charge.',
    evidenceCitations: [
      'POS for DD-156483: 3 items dispatched at 6:33 PM CDT',
      'Dasher delivery photo shows full sealed bag',
      'No redelivery request filed',
    ],
  },
  'dc-022': {
    shouldDispute: true,
    meritScore: 94,
    reasoning: 'Highest-value dispute in queue. Full order on single ticket, confirmed complete handoff. Customer has 4 claims in 3 months — none previously disputed. "Again" in comment is a red flag.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 7600,
    draftedDisputeText: 'Order DD-271940 — two mutton curries, paneer tikka, and mango lassi — was confirmed dispatched at 8:37 PM per POS. The Dasher\'s pickup log corroborates a complete handoff. This customer has filed four claims in three months (none disputed), and their comment "missing again" signals a repeat pattern. We request immediate reversal of the $76.00 charge.',
    evidenceCitations: [
      'POS for DD-271940: 4-item order dispatched at 8:37 PM CDT',
      'Dasher pickup log: complete handoff confirmed',
      'Customer refund history: 4 claims in 90 days — none previously contested',
    ],
  },

  // ── Human-review tier ──
  'dc-023': {
    shouldDispute: true,
    meritScore: 55,
    reasoning: 'Customer provides a specific claim (missing naan) that is credible but unverifiable from POS alone. Medium confidence — human should review before filing.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 500,
    draftedDisputeText: 'Order DD-382754 POS shows butter chicken, one garlic naan, and two mango lassis dispatched at 7:14 PM. The customer specified the naan was missing — a credible but individually-packaged item that could plausibly be omitted during a rush. We believe this dispute has merit but recommend human review of kitchen logs before submission. Estimated recoverable: $5.00.',
    evidenceCitations: [
      'POS for DD-382754: garlic naan on ticket, dispatched 7:14 PM CDT',
      'Individual naan packaging — possible omission during rush service',
    ],
  },
  'dc-024': {
    shouldDispute: true,
    meritScore: 48,
    reasoning: '31-minute delivery is on the higher end for tikka masala. Complaint is specific ("completely cold"). Moderate confidence — human review recommended.',
    resolvedChargeType: 'cold_food',
    recoverableCents: 2800,
    draftedDisputeText: 'Delivery time for order DD-493827 was 31 minutes — within range but elevated for fried items during peak service. The customer\'s complaint ("completely cold") is specific. While chicken tikka masala retains heat well in sealed containers, this case warrants human review of packaging logs before filing.',
    evidenceCitations: [
      'Delivery log DD-493827: 31-minute transit (elevated for peak service)',
      'Chicken tikka masala retains heat but 31 min is borderline',
    ],
  },
  'dc-025': {
    shouldDispute: true,
    meritScore: 62,
    reasoning: 'Butter chicken → paneer tikka swap is a plausible kitchen error when two similar-sized orders are packed simultaneously. POS shows butter chicken ordered; we cannot rule out packing mix-up.',
    resolvedChargeType: 'wrong_item',
    recoverableCents: 1800,
    draftedDisputeText: 'The customer for order DD-574923 reports receiving paneer tikka instead of butter chicken — a plausible packing mix-up during peak hours if two similar orders were staged simultaneously. Our POS shows butter chicken on the original ticket. Without photo evidence we cannot fully refute the claim, but the ticket supports our position. Human review recommended.',
    evidenceCitations: [
      'Ticket DD-574923: butter chicken ordered — paneer tikka not on ticket',
      'Peak-hour packing mix-up cannot be ruled out without photo',
    ],
  },
  'dc-026': {
    shouldDispute: true,
    meritScore: 45,
    reasoning: 'First-time customer with a very specific claim (both mains missing). Plausible but unverifiable — confidence is moderate. Human review before filing.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 3700,
    draftedDisputeText: 'Order DD-682047 shows chicken biryani, chole bhature, and raita all on one ticket, dispatched at 8:10 PM. The customer — a first-time order — reports both mains missing, which is an unlikely outcome for a 3-item bag. However, given the specific nature of the claim and no prior history, human review is recommended before submission.',
    evidenceCitations: [
      'POS for DD-682047: all 3 items on one ticket, dispatched 8:10 PM CDT',
      'First-time customer with specific claim — no history to compare',
    ],
  },

  // ── Skip tier ──
  'dc-027': {
    shouldDispute: false,
    meritScore: 15,
    reasoning: 'Platform delivery log shows no delivery scan. Customer provided doorstep photo. This appears to be a legitimate non-delivery; the charge is likely valid against the merchant.',
    resolvedChargeType: 'order_never_arrived',
    recoverableCents: 0,
    draftedDisputeText: 'Platform delivery logs show the Dasher accepted this order at 8:48 PM but no delivery scan was recorded, and the customer submitted a photo of an empty doorstep. This appears to be a legitimate non-delivery; disputing would likely be denied and damage our standing. Recommend accepting the charge.',
    evidenceCitations: [
      'Platform log: Dasher accepted DD-794183 but no delivery scan recorded',
      'Customer photo evidence: empty doorstep at delivery address',
    ],
  },
  'dc-028': {
    shouldDispute: false,
    meritScore: 20,
    reasoning: 'Customer cancelled 45 minutes after prep began. DoorDash policy assigns refund cost to merchant in this scenario. Charge is valid.',
    resolvedChargeType: 'customer_cancel',
    recoverableCents: 0,
    draftedDisputeText: 'The customer cancelled order DD-804163 45 minutes after the restaurant confirmed preparation had begun — kitchen logs confirm tikka masala and naan were already assembled. Platform cancellation policy assigns this refund to the merchant. The charge is valid; a dispute would be denied.',
    evidenceCitations: [
      'Kitchen log: tikka masala + naan assembled before cancel at 45-min mark',
      'DoorDash policy: merchant absorbs cancel cost when prep has started',
    ],
  },
  'dc-029': {
    shouldDispute: false,
    meritScore: 10,
    reasoning: 'Delivery transit was 52 minutes — significantly beyond normal. Masala dosa is temperature-sensitive. The cold-food complaint is legitimate and the platform delay is documented.',
    resolvedChargeType: 'cold_food',
    recoverableCents: 0,
    draftedDisputeText: 'Delivery for order DD-917834 logged 52 minutes from pickup to drop-off — well beyond the acceptable threshold for masala dosa, which degrades in texture quickly. The platform\'s own log documents the delay. A cold-food complaint under these circumstances is legitimate; disputing would likely be denied.',
    evidenceCitations: [
      'Delivery log DD-917834: 52-minute transit — significantly above average',
      'Masala dosa is texture-sensitive at extended transit times',
    ],
  },
  'dc-030': {
    shouldDispute: false,
    meritScore: 8,
    reasoning: 'Staff acknowledged that a printer outage caused the palak paneer to not print to the kitchen. Restaurant error is documented internally. Charge is valid.',
    resolvedChargeType: 'missing_item',
    recoverableCents: 0,
    draftedDisputeText: 'Staff at the location acknowledged that a printer outage at 9:02 PM caused one palak paneer ticket to not print to the kitchen for order DD-034729, resulting in the item being excluded from the bag. The error originated with the restaurant. The charge is valid and should not be disputed.',
    evidenceCitations: [
      'Kitchen log: printer outage at 9:02 PM caused missed ticket for DD-034729',
      'Staff acknowledgement on file confirming restaurant-side error',
    ],
  },
};

export function buildMockClassification(candidate: DisputeCandidate): ClassifiedDispute {
  const data = MOCK_DATA[candidate.id];
  if (!data) {
    throw new Error(`No mock data for candidate ID: ${candidate.id}`);
  }
  return {
    ...data,
    candidateId: candidate.id,
    generatedAt: GENERATED_AT,
  };
}
