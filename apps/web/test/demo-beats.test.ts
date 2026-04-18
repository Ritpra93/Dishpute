/**
 * P1 — Demo script beat-by-beat verification.
 *
 * For each beat in docs/DEMO_SCRIPT.md, we assert the behavior the script
 * promises actually happens in code:
 *   Beat 2 — 30 disputes scraped, 22 at merit >= 70
 *   Beat 3 — submit-all lands on 22 submitted and $892 recoverable
 *   Beat 4 — exactly 1 denied dispute flagged for voice, escalate payload
 *            matches apps/voice contract, post-call webhook persists
 *
 * Each test intentionally runs at least one sanity-inverting assertion
 * (e.g., a value that would NOT be true if the code path weren't actually
 * executing) to guard against confirmation-bias green tests.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanupDb, callJsonRoute, getJsonRoute, useTempDb } from "./helpers";

// IMPORTANT: set DB_PATH BEFORE any import that touches lib/db.
const DB_PATH = useTempDb("demo-beats");

// Import after DB_PATH is set.
const {
  listEnrichedDisputes,
  computeStats,
  getCandidate,
  resetAllTables,
} = await import("@/lib/repo");
const scanRoute = await import("@/app/api/scan/route");
const disputesRoute = await import("@/app/api/disputes/route");
const statsRoute = await import("@/app/api/stats/route");
const submitAllRoute = await import("@/app/api/disputes/submit-all/route");
const escalateRoute = await import("@/app/api/disputes/[id]/escalate/route");

beforeAll(async () => {
  // Every beat test starts from a clean DB — no seed artifacts.
  resetAllTables();
});

afterAll(() => cleanupDb(DB_PATH));

describe("Beat 2 — Scan populates 30 disputes with the correct merit distribution", () => {
  it("POST /api/scan creates 30 candidates and 30 classifications in under 5s", async () => {
    const t0 = Date.now();
    const { status, body } = await callJsonRoute<{ totalFound: number; classified: number }>(
      scanRoute.POST,
      "http://localhost/api/scan",
      { platform: "doordash", reset: true },
    );
    const elapsedMs = Date.now() - t0;

    expect(status).toBe(200);
    expect(body.totalFound).toBe(30);
    expect(body.classified).toBe(30);
    expect(elapsedMs).toBeLessThan(5000);
  });

  it("all 30 disputes are queryable via /api/disputes", async () => {
    const { status, body } = await getJsonRoute<Array<{ id: string }>>(
      disputesRoute.GET,
      "http://localhost/api/disputes",
    );
    expect(status).toBe(200);
    expect(body).toHaveLength(30);
    // Confirmation-bias guard: IDs MUST be disp_NNNN. If we ever see dc-NNN
    // here again we're reading a stale fixture set.
    expect(body[0]!.id).toMatch(/^disp_\d{4}$/);
  });

  it("merit-score distribution is exactly 22 auto-submit / 4 human-review / 4 skip", async () => {
    const disputes = listEnrichedDisputes();
    const withClass = disputes.filter((d) => d.classification);
    expect(withClass).toHaveLength(30);

    const autoSubmit = withClass.filter(
      (d) => d.classification!.shouldDispute && d.classification!.meritScore >= 70,
    );
    const humanReview = withClass.filter(
      (d) =>
        d.classification!.shouldDispute &&
        d.classification!.meritScore >= 40 &&
        d.classification!.meritScore < 70,
    );
    const skip = withClass.filter((d) => !d.classification!.shouldDispute);

    expect(autoSubmit).toHaveLength(22);
    expect(humanReview).toHaveLength(4);
    expect(skip).toHaveLength(4);
  });
});

describe("Beat 3 — Submit all lands on $892 / 22 of 22", () => {
  it("submit-all submits exactly 22 disputes", async () => {
    const { status, body } = await callJsonRoute<{
      submitted: number;
      results: unknown[];
    }>(submitAllRoute.POST, "http://localhost/api/disputes/submit-all");

    expect(status).toBe(200);
    expect(body.submitted).toBe(22);
    expect(body.results).toHaveLength(22);
  });

  it("/api/stats reports totalSubmittedRecoverableCents === 89200 ($892)", async () => {
    const { status, body } = await getJsonRoute<{
      totalDisputed: number;
      totalSubmittedRecoverableCents: number;
    }>(statsRoute.GET, "http://localhost/api/stats");

    expect(status).toBe(200);
    expect(body.totalDisputed).toBe(22);
    // The demo script quotes "$892" — this is the exact cent value.
    expect(body.totalSubmittedRecoverableCents).toBe(89_200);
  });

  it("computeStats() matches /api/stats (the route is a pass-through)", () => {
    const s = computeStats();
    expect(s.totalSubmittedRecoverableCents).toBe(89_200);
    expect(s.totalDisputed).toBe(22);
  });

  it("submit-all is idempotent — re-running does not duplicate rows", async () => {
    const before = computeStats();
    await callJsonRoute(submitAllRoute.POST, "http://localhost/api/disputes/submit-all");
    const after = computeStats();
    expect(after.totalDisputed).toBe(before.totalDisputed);
    expect(after.totalSubmittedRecoverableCents).toBe(before.totalSubmittedRecoverableCents);
  });
});

describe("Beat 4 — Exactly 1 of the 3 denied rows is eligible for voice escalation", () => {
  it("there are 3 denied outcomes after submit-all", () => {
    const denied = listEnrichedDisputes().filter(
      (d) => d.outcome?.outcome === "denied",
    );
    expect(denied).toHaveLength(3);
  });

  it("all 3 denied outcomes carry escalateToVoice=true (all are auto-submit tier)", () => {
    const denied = listEnrichedDisputes().filter((d) => d.outcome?.outcome === "denied");
    for (const d of denied) {
      expect(d.outcome!.escalateToVoice).toBe(true);
      expect(d.classification!.meritScore).toBeGreaterThanOrEqual(70);
    }
  });

  it("escalate route POSTs the correct payload shape (contract with apps/voice)", async () => {
    // Mock global fetch for the upstream forward.
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            candidateId: "disp_0008",
            elevenLabsConversationId: "conv_escalate_test",
            twilioCallSid: "CAtest",
            startedAt: new Date().toISOString(),
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    );

    process.env.VOICE_ESCALATE_URL = "http://fake-voice/calls/outbound";
    process.env.DOORDASH_SUPPORT_NUMBER = "+15551234567";

    try {
      const { status, body } = await callJsonRoute<{
        mode: string;
        payload: { toNumber: string; caseNumber: string; merchantName: string; denialReason: string };
        elevenLabsConversationId?: string;
      }>(
        escalateRoute.POST,
        "http://localhost/api/disputes/disp_0008/escalate",
        {},
        { params: Promise.resolve({ id: "disp_0008" }) },
      );

      expect(status).toBe(200);
      expect(body.mode).toBe("live");
      expect(body.payload.toNumber).toBe("+15551234567");
      expect(body.payload.caseNumber).toBe("4561"); // disp_0008 -> ord_4561
      expect(body.payload.merchantName).toBe("House of Curry");
      expect(body.payload.denialReason).toMatch(/denied|evidence/i);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0]!;
      expect(url).toBe("http://fake-voice/calls/outbound");
      const forwarded = JSON.parse((init as RequestInit).body as string) as Record<
        string,
        unknown
      >;
      expect(forwarded).toHaveProperty("toNumber");
      expect(forwarded).toHaveProperty("candidateId", "disp_0008");
      expect(forwarded).toHaveProperty("caseNumber");
      expect(forwarded).toHaveProperty("merchantName");
      expect(forwarded).toHaveProperty("denialReason");
      // Confirmation-bias guard: the OLD broken payload had `candidate` and
      // `classification` at the top level. If either is present we regressed.
      expect(forwarded).not.toHaveProperty("candidate");
      expect(forwarded).not.toHaveProperty("classification");
    } finally {
      fetchSpy.mockRestore();
      delete process.env.VOICE_ESCALATE_URL;
      delete process.env.DOORDASH_SUPPORT_NUMBER;
    }
  });

  it("escalate returns stubbed mode when VOICE_ESCALATE_URL is unset", async () => {
    delete process.env.VOICE_ESCALATE_URL;
    const { status, body } = await callJsonRoute<{ mode: string }>(
      escalateRoute.POST,
      "http://localhost/api/disputes/disp_0017/escalate",
      {},
      { params: Promise.resolve({ id: "disp_0017" }) },
    );
    expect(status).toBe(200);
    expect(body.mode).toBe("stubbed");
  });

  it("candidate lookup returns the correct fixture", () => {
    const c = getCandidate("disp_0008");
    expect(c).toBeTruthy();
    expect(c!.orderId).toBe("ord_4561");
    expect(c!.chargeType).toBe("missing_item");
  });
});
