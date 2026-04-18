/**
 * P3 — Adversarial edge cases.
 *
 * Confirmation-bias killer tests. For every scenario we believe we handle,
 * prove it by running the failure case AND the success case and asserting
 * the consumer doesn't crash + produces the documented state.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanupDb, callJsonRoute, getJsonRoute, useTempDb } from "./helpers";

const DB_PATH = useTempDb("edges");

const {
  listEnrichedDisputes,
  computeStats,
  listSubmittableClassifications,
  resetAllTables,
  upsertCandidate,
  upsertClassification,
  upsertOutcome,
} = await import("@/lib/repo");
const { FIXTURE_DISPUTES } = await import("@counter/types");
const scanRoute = await import("@/app/api/scan/route");
const statsRoute = await import("@/app/api/stats/route");
const submitAllRoute = await import("@/app/api/disputes/submit-all/route");
const singleSubmitRoute = await import("@/app/api/disputes/[id]/submit/route");
const escalateRoute = await import("@/app/api/disputes/[id]/escalate/route");

beforeEach(() => resetAllTables());
afterAll(() => cleanupDb(DB_PATH));

// ─── P3.1 scraper returns 0 / 1 / 100 disputes ─────────────────────────────

describe("P3.1 — dashboard handles empty / single / large dispute sets", () => {
  it("listEnrichedDisputes on empty DB returns []", () => {
    expect(listEnrichedDisputes()).toEqual([]);
  });

  it("listEnrichedDisputes after upsertCandidate(single) returns 1 row", () => {
    const one = FIXTURE_DISPUTES[0]!;
    upsertCandidate(one);
    expect(listEnrichedDisputes()).toHaveLength(1);
  });

  it("upserts of 100 candidates all land (pid-generated IDs)", () => {
    const base = FIXTURE_DISPUTES[0]!;
    for (let i = 0; i < 100; i++) {
      upsertCandidate({ ...base, id: `edge_${i.toString().padStart(3, "0")}`, orderId: `ord_edge_${i}` });
    }
    expect(listEnrichedDisputes()).toHaveLength(100);
  });
});

// ─── P3.2 meritScore boundary conditions ───────────────────────────────────

describe("P3.2 — merit threshold filter is strict >=70", () => {
  beforeEach(() => {
    // Single fixture candidate so we can vary its classification
    upsertCandidate(FIXTURE_DISPUTES[0]!);
  });

  it("meritScore=69 is NOT submittable", () => {
    upsertClassification({
      candidateId: FIXTURE_DISPUTES[0]!.id,
      shouldDispute: true,
      meritScore: 69,
      reasoning: "just below",
      resolvedChargeType: "missing_item",
      recoverableCents: 100,
      draftedDisputeText: "x".repeat(60),
      evidenceCitations: ["e"],
      generatedAt: new Date().toISOString(),
    });
    expect(listSubmittableClassifications(70)).toHaveLength(0);
  });

  it("meritScore=70 IS submittable", () => {
    upsertClassification({
      candidateId: FIXTURE_DISPUTES[0]!.id,
      shouldDispute: true,
      meritScore: 70,
      reasoning: "at threshold",
      resolvedChargeType: "missing_item",
      recoverableCents: 100,
      draftedDisputeText: "x".repeat(60),
      evidenceCitations: ["e"],
      generatedAt: new Date().toISOString(),
    });
    expect(listSubmittableClassifications(70)).toHaveLength(1);
  });

  it("meritScore=100 IS submittable", () => {
    upsertClassification({
      candidateId: FIXTURE_DISPUTES[0]!.id,
      shouldDispute: true,
      meritScore: 100,
      reasoning: "max",
      resolvedChargeType: "missing_item",
      recoverableCents: 100,
      draftedDisputeText: "x".repeat(60),
      evidenceCitations: ["e"],
      generatedAt: new Date().toISOString(),
    });
    expect(listSubmittableClassifications(70)).toHaveLength(1);
  });

  it("shouldDispute=false with meritScore=95 is NOT submittable (shouldDispute gate)", () => {
    upsertClassification({
      candidateId: FIXTURE_DISPUTES[0]!.id,
      shouldDispute: false,
      meritScore: 95,
      reasoning: "explicitly skipped",
      resolvedChargeType: "customer_cancel",
      recoverableCents: 0,
      draftedDisputeText: "x".repeat(60),
      evidenceCitations: ["e"],
      generatedAt: new Date().toISOString(),
    });
    expect(listSubmittableClassifications(70)).toHaveLength(0);
  });
});

// ─── P3.3 / P3.8 — idempotent submission (double-click) ────────────────────

describe("P3.3 — submit-all is safe to call repeatedly", () => {
  it("two consecutive POSTs to submit-all don't double-count", async () => {
    await callJsonRoute(scanRoute.POST, "http://localhost/api/scan", { platform: "doordash", reset: true });
    await callJsonRoute(submitAllRoute.POST, "http://localhost/api/disputes/submit-all");
    const s1 = computeStats();
    await callJsonRoute(submitAllRoute.POST, "http://localhost/api/disputes/submit-all");
    const s2 = computeStats();
    expect(s2.totalDisputed).toBe(s1.totalDisputed);
    expect(s2.totalSubmittedRecoverableCents).toBe(s1.totalSubmittedRecoverableCents);
  });

  it("single-submit called twice on same candidate is idempotent", async () => {
    await callJsonRoute(scanRoute.POST, "http://localhost/api/scan", { platform: "doordash", reset: true });
    const first = await callJsonRoute<{ candidateId: string; status: string }>(
      singleSubmitRoute.POST,
      "http://localhost/api/disputes/disp_0001/submit",
      undefined,
      { params: Promise.resolve({ id: "disp_0001" }) },
    );
    const second = await callJsonRoute<{ candidateId: string; status: string }>(
      singleSubmitRoute.POST,
      "http://localhost/api/disputes/disp_0001/submit",
      undefined,
      { params: Promise.resolve({ id: "disp_0001" }) },
    );
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    // Stats should be stable
    const s = computeStats();
    expect(s.totalDisputed).toBeGreaterThan(0);
  });
});

// ─── P3.4 — computeStats on empty DB returns zeros (not NaN) ───────────────

describe("P3.4 — computeStats on empty DB", () => {
  it("returns all-zeros, no NaN/undefined", async () => {
    const { status, body } = await getJsonRoute<{
      totalCharges: number;
      totalDisputed: number;
      totalSubmittedRecoverableCents: number;
      totalRealizedCents: number;
      totalInFlightCents: number;
      totalDeniedCents: number;
      counterFeeCents: number;
    }>(statsRoute.GET, "http://localhost/api/stats");
    expect(status).toBe(200);
    for (const v of Object.values(body)) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBe(0);
    }
  });
});

// ─── P3.5 — Escalate without VOICE_ESCALATE_URL ────────────────────────────

describe("P3.5 — Escalate without voice URL configured", () => {
  beforeEach(async () => {
    await callJsonRoute(scanRoute.POST, "http://localhost/api/scan", { platform: "doordash", reset: true });
    await callJsonRoute(submitAllRoute.POST, "http://localhost/api/disputes/submit-all");
    delete process.env.VOICE_ESCALATE_URL;
  });

  it("returns a stubbed mode, never a 5xx", async () => {
    const { status, body } = await callJsonRoute<{ mode: string; payload: unknown }>(
      escalateRoute.POST,
      "http://localhost/api/disputes/disp_0008/escalate",
      {},
      { params: Promise.resolve({ id: "disp_0008" }) },
    );
    expect(status).toBe(200);
    expect(body.mode).toBe("stubbed");
    // Still gives UI everything it needs to show "calling..." state.
    expect(body.payload).toBeTruthy();
  });
});

// ─── P3.6 — Escalate for unknown candidate ID returns 404 cleanly ──────────

describe("P3.6 — Escalate with non-existent candidate ID", () => {
  it("returns 404 with a clear error, doesn't crash", async () => {
    const { status, body } = await callJsonRoute<{ error: string }>(
      escalateRoute.POST,
      "http://localhost/api/disputes/disp_9999/escalate",
      {},
      { params: Promise.resolve({ id: "disp_9999" }) },
    );
    expect(status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });
});

// ─── P3.7 — draftedDisputeText edge cases (survival through JSON+SQL) ──────

describe("P3.7 — draftedDisputeText edge cases", () => {
  it("text with quotes, newlines, unicode survives round-trip", () => {
    upsertCandidate(FIXTURE_DISPUTES[0]!);
    const weird =
      'He said "the order was never delivered"\nand she replied: \'no way\' — also emoji ₹₹₹ and curly "quotes".';
    upsertClassification({
      candidateId: FIXTURE_DISPUTES[0]!.id,
      shouldDispute: true,
      meritScore: 88,
      reasoning: "r",
      resolvedChargeType: "missing_item",
      recoverableCents: 100,
      draftedDisputeText: weird.padEnd(60, " "),
      evidenceCitations: ["ok"],
      generatedAt: new Date().toISOString(),
    });
    const d = listEnrichedDisputes().find((x) => x.id === FIXTURE_DISPUTES[0]!.id)!;
    expect(d.classification!.draftedDisputeText.startsWith('He said "')).toBe(true);
    expect(d.classification!.draftedDisputeText).toContain("\n");
    expect(d.classification!.draftedDisputeText).toContain("₹");
  });

  it("1200-char text survives round-trip", () => {
    upsertCandidate(FIXTURE_DISPUTES[0]!);
    const big = "a".repeat(1200);
    upsertClassification({
      candidateId: FIXTURE_DISPUTES[0]!.id,
      shouldDispute: true,
      meritScore: 88,
      reasoning: "r",
      resolvedChargeType: "missing_item",
      recoverableCents: 100,
      draftedDisputeText: big,
      evidenceCitations: ["ok"],
      generatedAt: new Date().toISOString(),
    });
    const d = listEnrichedDisputes().find((x) => x.id === FIXTURE_DISPUTES[0]!.id)!;
    expect(d.classification!.draftedDisputeText.length).toBe(1200);
  });
});

// ─── P3.9 — Cold-start (no seed) — dashboard shows empty-state, doesn't crash

describe("P3.9 — Cold-start empty dashboard", () => {
  it("listEnrichedDisputes returns [] with no errors", () => {
    expect(() => listEnrichedDisputes()).not.toThrow();
    expect(listEnrichedDisputes()).toEqual([]);
  });
});

// ─── P3.10 — SCRAPER_MODE=cache still lands the $892 number ────────────────

describe("P3.10 — SCRAPER_MODE=cache keeps the demo math intact", () => {
  it("with cache mode on, scan+submit-all still lands 22 submitted / $892", async () => {
    process.env.SCRAPER_MODE = "cache";
    try {
      await callJsonRoute(scanRoute.POST, "http://localhost/api/scan", { platform: "doordash", reset: true });
      await callJsonRoute(submitAllRoute.POST, "http://localhost/api/disputes/submit-all");
      const s = computeStats();
      expect(s.totalDisputed).toBe(22);
      expect(s.totalSubmittedRecoverableCents).toBe(89_200);
    } finally {
      delete process.env.SCRAPER_MODE;
    }
  });
});

// ─── P3.11 — Escalate is safe when outcome was already approved ────────────

describe("P3.11 — Escalate on an already-approved dispute still upserts to denied", () => {
  beforeEach(async () => {
    await callJsonRoute(scanRoute.POST, "http://localhost/api/scan", { platform: "doordash", reset: true });
    await callJsonRoute(submitAllRoute.POST, "http://localhost/api/disputes/submit-all");
    // Pre-mark disp_0001 as approved before escalating it
    upsertOutcome({
      candidateId: "disp_0001",
      outcome: "approved",
      refundedCents: 5390,
      adjudicatedAt: new Date().toISOString(),
      escalateToVoice: false,
    });
  });

  it("escalation flips outcome to denied+escalateToVoice=true (idempotency via ON CONFLICT)", async () => {
    delete process.env.VOICE_ESCALATE_URL;
    await callJsonRoute(
      escalateRoute.POST,
      "http://localhost/api/disputes/disp_0001/escalate",
      {},
      { params: Promise.resolve({ id: "disp_0001" }) },
    );
    const d = listEnrichedDisputes().find((x) => x.id === "disp_0001")!;
    expect(d.outcome!.outcome).toBe("denied");
    expect(d.outcome!.escalateToVoice).toBe(true);
  });
});
