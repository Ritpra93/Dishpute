import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { createMockScraper, createScraper, DEMO_OUTCOMES_SUMMARY } from "../src/index";

describe("createMockScraper", () => {
  it("listOpenDisputes returns 30 records", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const disputes = await scraper.listOpenDisputes({ merchantId: "merchant_hoc", platform: "doordash" });
    expect(disputes).toHaveLength(30);
  });

  it("all records have required fields", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const disputes = await scraper.listOpenDisputes({ merchantId: "merchant_hoc", platform: "doordash" });
    for (const d of disputes) {
      expect(d.id).toBeTruthy();
      expect(d.platform).toBe("doordash");
      expect(d.orderId).toBeTruthy();
      expect(typeof d.chargeAmountCents).toBe("number");
      expect(d.chargeAmountCents).toBeGreaterThan(0);
      expect(Array.isArray(d.itemsReported)).toBe(true);
      expect(d.orderTimestamp).toBeTruthy();
      expect(d.chargeTimestamp).toBeTruthy();
      expect(d.disputeDeadline).toBeTruthy();
      expect(d.portalUrl).toBeTruthy();
      expect(d.rawText).toBeTruthy();
    }
  });

  it("fixture has correct charge-type distribution", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const disputes = await scraper.listOpenDisputes({ merchantId: "merchant_hoc", platform: "doordash" });

    const counts: Record<string, number> = {};
    for (const d of disputes) {
      counts[d.chargeType] = (counts[d.chargeType] ?? 0) + 1;
    }

    expect(counts["missing_item"]).toBe(21);
    expect(counts["wrong_item"]).toBe(3);
    expect(counts["cold_food"]).toBe(4);
    expect(counts["order_never_arrived"]).toBe(1);
    expect(counts["customer_cancel"]).toBe(1);
  });

  it("submitDispute returns submitted status with confirmation ID", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const disputes = await scraper.listOpenDisputes({ merchantId: "merchant_hoc", platform: "doordash" });
    const first = disputes[0]!;

    const result = await scraper.submitDispute({ candidate: first, draftedText: "Test dispute text" });

    expect(result.candidateId).toBe(first.id);
    expect(result.status).toBe("submitted");
    expect(result.platformConfirmationId).toMatch(/^CONF-\d{6}$/);
    expect(result.submittedAt).toBeTruthy();
  });

  it("scrapeOutcomes returns correct outcomes for known IDs", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const outcomes = await scraper.scrapeOutcomes({
      candidateIds: ["dc-001", "dc-022", "dc-023"],
    });

    expect(outcomes).toHaveLength(3);

    const byId = Object.fromEntries(outcomes.map((o) => [o.candidateId, o]));

    // dc-001 is missing_item — approved with full refund
    expect(byId["dc-001"]?.outcome).toBe("approved");
    expect(byId["dc-001"]?.refundedCents).toBe(5200);

    // dc-022 is the denied case (suspicious refund-history pattern) — triggers voice escalation in the demo
    expect(byId["dc-022"]?.outcome).toBe("denied");
    expect(byId["dc-022"]?.refundedCents).toBe(0);

    // dc-023 is human-review tier — still pending
    expect(byId["dc-023"]?.outcome).toBe("pending");
    expect(byId["dc-023"]?.refundedCents).toBe(0);
  });

  it("scrapeOutcomes returns all 30 fixture IDs with correct demo distribution", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const allIds = Array.from({ length: 30 }, (_, i) => `dc-${String(i + 1).padStart(3, "0")}`);
    const outcomes = await scraper.scrapeOutcomes({ candidateIds: allIds });

    expect(outcomes).toHaveLength(30);

    const counts: Record<string, number> = { approved: 0, denied: 0, pending: 0 };
    let recoveredCents = 0;
    for (const o of outcomes) {
      counts[o.outcome] = (counts[o.outcome] ?? 0) + 1;
      recoveredCents += o.refundedCents;
    }

    expect(counts["approved"]).toBe(22);
    expect(counts["denied"]).toBe(1);
    expect(counts["pending"]).toBe(7);
    expect(recoveredCents).toBe(85800); // $858.00
  });

  it("scrapeOutcomes falls back to pending for unknown IDs", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const outcomes = await scraper.scrapeOutcomes({ candidateIds: ["dc-999"] });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.outcome).toBe("pending");
    expect(outcomes[0]?.refundedCents).toBe(0);
  });

  it("DEMO_OUTCOMES_SUMMARY totals are consistent", () => {
    expect(DEMO_OUTCOMES_SUMMARY.totalApproved).toBe(22);
    expect(DEMO_OUTCOMES_SUMMARY.totalDenied).toBe(1);
    expect(DEMO_OUTCOMES_SUMMARY.totalPending).toBe(7);
    expect(DEMO_OUTCOMES_SUMMARY.totalRecoveredCents).toBe(85800);
  });
});

describe("createScraper SCRAPER_MODE=cache", () => {
  beforeEach(() => {
    process.env["SCRAPER_MODE"] = "cache";
  });

  afterEach(() => {
    delete process.env["SCRAPER_MODE"];
  });

  it("listOpenDisputes returns 30 fixture records", async () => {
    const scraper = createScraper({ tinyFishApiKey: "dummy" });
    const disputes = await scraper.listOpenDisputes({ merchantId: "merchant_hoc", platform: "doordash" });
    expect(disputes).toHaveLength(30);
  });

  it("submitDispute returns submitted with CONF ID", async () => {
    const scraper = createScraper({ tinyFishApiKey: "dummy" });
    const disputes = await scraper.listOpenDisputes({ merchantId: "merchant_hoc", platform: "doordash" });
    const result = await scraper.submitDispute({ candidate: disputes[0]!, draftedText: "test" });
    expect(result.status).toBe("submitted");
    expect(result.platformConfirmationId).toMatch(/^CONF-\d{6}$/);
  });

  it("scrapeOutcomes returns demo outcomes (not all-pending)", async () => {
    const scraper = createScraper({ tinyFishApiKey: "dummy" });
    const allIds = Array.from({ length: 30 }, (_, i) => `dc-${String(i + 1).padStart(3, "0")}`);
    const outcomes = await scraper.scrapeOutcomes({ candidateIds: allIds });

    const counts: Record<string, number> = { approved: 0, denied: 0, pending: 0 };
    for (const o of outcomes) {
      counts[o.outcome] = (counts[o.outcome] ?? 0) + 1;
    }

    // Must match DEMO_OUTCOMES — not all-pending
    expect(counts["approved"]).toBe(22);
    expect(counts["denied"]).toBe(1);
    expect(counts["pending"]).toBe(7);
  });
});
