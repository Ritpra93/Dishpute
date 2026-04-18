import { describe, it, expect, afterEach, beforeEach } from "vitest";
import {
  createMockScraper,
  createScraper,
  DEMO_APPROVED_IDS,
  DEMO_DENIED_IDS,
  DEMO_OUTCOMES_SUMMARY,
} from "../src/index";

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

  it("fixture has correct charge-type distribution (matches packages/types/CLAUDE.md spec)", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const disputes = await scraper.listOpenDisputes({ merchantId: "merchant_hoc", platform: "doordash" });

    const counts: Record<string, number> = {};
    for (const d of disputes) {
      counts[d.chargeType] = (counts[d.chargeType] ?? 0) + 1;
    }

    expect(counts["missing_item"]).toBe(15);
    expect(counts["wrong_item"]).toBe(6);
    expect(counts["cold_food"]).toBe(4);
    expect(counts["order_never_arrived"]).toBe(3);
    expect(counts["customer_cancel"]).toBe(2);
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

  it("scrapeOutcomes returns correct outcomes for the three canonical demo IDs", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const outcomes = await scraper.scrapeOutcomes({
      candidateIds: ["disp_0001", "disp_0008", "disp_0014"],
    });

    expect(outcomes).toHaveLength(3);
    const byId = Object.fromEntries(outcomes.map((o) => [o.candidateId, o]));

    // disp_0001 — the demo's hero approved dispute (order 4472)
    expect(byId["disp_0001"]?.outcome).toBe("approved");
    expect(byId["disp_0001"]?.refundedCents).toBe(5390);

    // disp_0008 — denied, one of three voice-escalation candidates
    expect(byId["disp_0008"]?.outcome).toBe("denied");
    expect(byId["disp_0008"]?.refundedCents).toBe(0);

    // disp_0014 — human-review tier, never submitted → pending fallback
    expect(byId["disp_0014"]?.outcome).toBe("pending");
    expect(byId["disp_0014"]?.refundedCents).toBe(0);
  });

  it("scrapeOutcomes returns all 30 fixture IDs with correct demo distribution", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const allIds = Array.from({ length: 30 }, (_, i) => `disp_${String(i + 1).padStart(4, "0")}`);
    const outcomes = await scraper.scrapeOutcomes({ candidateIds: allIds });

    expect(outcomes).toHaveLength(30);

    const counts: Record<string, number> = { approved: 0, denied: 0, pending: 0 };
    let recoveredCents = 0;
    for (const o of outcomes) {
      counts[o.outcome] = (counts[o.outcome] ?? 0) + 1;
      recoveredCents += o.refundedCents;
    }

    // 3 approved (demo hero set) + 3 denied (escalation candidates) + 24 pending (16 high-merit in-flight + 8 skip/human-review fallback)
    expect(counts["approved"]).toBe(3);
    expect(counts["denied"]).toBe(3);
    expect(counts["pending"]).toBe(24);
    expect(recoveredCents).toBe(21190); // $211.90 already recovered — matches sum of 3 approved recoverableCents
  });

  it("scrapeOutcomes falls back to pending for unknown IDs", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const outcomes = await scraper.scrapeOutcomes({ candidateIds: ["disp_9999"] });

    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]?.outcome).toBe("pending");
    expect(outcomes[0]?.refundedCents).toBe(0);
  });

  it("DEMO_OUTCOMES_SUMMARY totals are consistent", () => {
    expect(DEMO_OUTCOMES_SUMMARY.totalApproved).toBe(3);
    expect(DEMO_OUTCOMES_SUMMARY.totalDenied).toBe(3);
    expect(DEMO_OUTCOMES_SUMMARY.totalPending).toBe(16);
    expect(DEMO_OUTCOMES_SUMMARY.totalRecoveredCents).toBe(21190);
  });

  it("exported DEMO_APPROVED_IDS and DEMO_DENIED_IDS are the canonical 3+3 sets", () => {
    expect([...DEMO_APPROVED_IDS]).toEqual(["disp_0001", "disp_0004", "disp_0011"]);
    expect([...DEMO_DENIED_IDS]).toEqual(["disp_0008", "disp_0017", "disp_0023"]);
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
    const allIds = Array.from({ length: 30 }, (_, i) => `disp_${String(i + 1).padStart(4, "0")}`);
    const outcomes = await scraper.scrapeOutcomes({ candidateIds: allIds });

    const counts: Record<string, number> = { approved: 0, denied: 0, pending: 0 };
    for (const o of outcomes) {
      counts[o.outcome] = (counts[o.outcome] ?? 0) + 1;
    }

    // Must match DEMO_OUTCOMES — not all-pending
    expect(counts["approved"]).toBe(3);
    expect(counts["denied"]).toBe(3);
    expect(counts["pending"]).toBe(24);
  });
});
