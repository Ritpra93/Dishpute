/**
 * P2 — Contract tests at each module boundary.
 *
 * Each test runs the producer end-to-end, feeds output into the consumer,
 * and asserts the consumer doesn't crash + produces expected state.
 *
 *   P2.1 scraper → dashboard  (listOpenDisputes → upsertCandidate)
 *   P2.2 classifier → dashboard (classifyMany → upsertClassification)
 *   P2.3 dashboard → voice  (escalate POST builds the correct voice payload)
 *   P2.4 voice → dashboard  (post-call webhook → voice_calls → stats)
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanupDb, callJsonRoute, useTempDb } from "./helpers";

const DB_PATH = useTempDb("contracts");

const { createMockScraper } = await import("@counter/scraper");
const { createMockClassifier } = await import("@counter/classifier");
const { FIXTURE_DISPUTES } = await import("@counter/types");
const {
  upsertCandidate,
  upsertClassification,
  listEnrichedDisputes,
  computeStats,
  resetAllTables,
} = await import("@/lib/repo");
const { getDb } = await import("@/lib/db");
const escalateRoute = await import("@/app/api/disputes/[id]/escalate/route");

beforeAll(() => resetAllTables());
afterAll(() => cleanupDb(DB_PATH));

describe("P2.1 scraper → dashboard", () => {
  it("every DisputeCandidate from listOpenDisputes survives upsertCandidate round-trip", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const candidates = await scraper.listOpenDisputes({
      merchantId: "merchant_hoc",
      platform: "doordash",
    });
    expect(candidates).toHaveLength(30);

    for (const c of candidates) upsertCandidate(c);

    const enriched = listEnrichedDisputes();
    expect(enriched).toHaveLength(30);

    // Deep equality on a sample row — JSON.parse(items_reported) / every field preserved.
    const original = candidates.find((c) => c.id === "disp_0008")!;
    const roundTrip = enriched.find((d) => d.id === "disp_0008")!;
    expect(roundTrip.id).toBe(original.id);
    expect(roundTrip.orderId).toBe(original.orderId);
    expect(roundTrip.chargeAmountCents).toBe(original.chargeAmountCents);
    expect(roundTrip.itemsReported).toEqual(original.itemsReported);
    expect(roundTrip.customerComment).toBe(original.customerComment);
  });

  it("upsertCandidate is idempotent on primary-key conflict", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const [c] = await scraper.listOpenDisputes({
      merchantId: "merchant_hoc",
      platform: "doordash",
    });
    upsertCandidate(c!);
    upsertCandidate(c!);
    const n = (getDb().prepare("SELECT COUNT(*) AS n FROM dispute_candidates").get() as { n: number }).n;
    expect(n).toBe(30); // still the full set, no dupes
  });
});

describe("P2.2 classifier → dashboard", () => {
  it("every ClassifiedDispute from classifyMany survives upsertClassification round-trip", async () => {
    const classifier = createMockClassifier();
    const classifications = await classifier.classifyMany(FIXTURE_DISPUTES);
    expect(classifications).toHaveLength(30);

    for (const c of classifications) upsertClassification(c);

    const enriched = listEnrichedDisputes();
    const withClass = enriched.filter((d) => d.classification);
    expect(withClass).toHaveLength(30);

    // Specific sample check — disp_0008 is our canonical denied case.
    const sample = enriched.find((d) => d.id === "disp_0008")!;
    expect(sample.classification!.shouldDispute).toBe(true);
    expect(sample.classification!.meritScore).toBe(87);
    expect(sample.classification!.recoverableCents).toBe(3920);
    expect(sample.classification!.evidenceCitations.length).toBeGreaterThanOrEqual(1);
  });

  it("draftedDisputeText survives JSON round-trip even with quote characters", async () => {
    const classifier = createMockClassifier();
    const results = await classifier.classifyMany(FIXTURE_DISPUTES);
    for (const r of results) upsertClassification(r);

    const enriched = listEnrichedDisputes();
    const sample = enriched.find((d) => d.id === "disp_0021")!; // long draft with punctuation
    expect(sample.classification!.draftedDisputeText).toContain("driver-side");
    expect(sample.classification!.draftedDisputeText.length).toBeLessThan(1200);
    expect(sample.classification!.draftedDisputeText.length).toBeGreaterThanOrEqual(50);
  });
});

describe("P2.3 dashboard → voice (escalate payload matches /calls/outbound contract)", () => {
  it("escalate POST forwards exactly the 5 fields voice expects", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ elevenLabsConversationId: "conv_x", twilioCallSid: "CA_x", startedAt: new Date().toISOString() }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );

    process.env.VOICE_ESCALATE_URL = "http://fake/outbound";
    process.env.DOORDASH_SUPPORT_NUMBER = "+16125551212";

    try {
      await callJsonRoute(
        escalateRoute.POST,
        "http://localhost/api/disputes/disp_0017/escalate",
        { reason: "Platform denied" },
        { params: Promise.resolve({ id: "disp_0017" }) },
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [, init] = fetchSpy.mock.calls[0]!;
      const sent = JSON.parse((init as RequestInit).body as string) as Record<string, unknown>;

      // Exactly the 5-field contract from apps/voice/src/routes/calls.ts
      const expectedKeys = new Set([
        "toNumber",
        "candidateId",
        "caseNumber",
        "merchantName",
        "denialReason",
      ]);
      expect(new Set(Object.keys(sent))).toEqual(expectedKeys);
      expect(sent.toNumber).toBe("+16125551212");
      expect(sent.candidateId).toBe("disp_0017");
      expect(sent.caseNumber).toBe("4671"); // derived from ord_4671
      expect(sent.merchantName).toBe("House of Curry");
      expect(typeof sent.denialReason).toBe("string");
      expect((sent.denialReason as string).length).toBeGreaterThan(0);
    } finally {
      fetchSpy.mockRestore();
      delete process.env.VOICE_ESCALATE_URL;
      delete process.env.DOORDASH_SUPPORT_NUMBER;
    }
  });

  it("returns 502 when voice service is unreachable (not a 500 that crashes UI)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new TypeError("fetch failed — simulated network error");
    });
    process.env.VOICE_ESCALATE_URL = "http://fake/outbound";
    try {
      const { status, body } = await callJsonRoute<{ mode: string; error: string }>(
        escalateRoute.POST,
        "http://localhost/api/disputes/disp_0023/escalate",
        {},
        { params: Promise.resolve({ id: "disp_0023" }) },
      );
      expect(status).toBe(502);
      expect(body.mode).toBe("error");
      expect(body.error).toMatch(/network|fetch/i);
    } finally {
      fetchSpy.mockRestore();
      delete process.env.VOICE_ESCALATE_URL;
    }
  });
});

describe("P2.4 voice → dashboard (voice_calls rows roll up into stats)", () => {
  it("a voice_calls row with call_outcome='recovered' increments totalRealizedCents", () => {
    const before = computeStats();

    // Simulate the voice service persisting a recovered call for disp_0023.
    // (apps/voice/src/db.ts.upsertVoiceCall does exactly this insert shape.)
    getDb()
      .prepare(
        `INSERT INTO voice_calls (
          candidate_id, eleven_labs_conversation_id, twilio_call_sid,
          started_at, ended_at, transcript_json, call_outcome, recovered_cents
        ) VALUES (
          @candidate_id, @conv_id, @twilio_sid,
          @started, @ended, @transcript, @outcome, @recovered
        )`,
      )
      .run({
        candidate_id: "disp_0023",
        conv_id: "conv_voice_recovered_test",
        twilio_sid: "CA_test_recovered",
        started: new Date().toISOString(),
        ended: new Date().toISOString(),
        transcript: JSON.stringify([
          { role: "agent", message: "Case 4744.", timeInCallSecs: 1 },
          { role: "user", message: "Refunded.", timeInCallSecs: 14 },
        ]),
        outcome: "recovered",
        recovered: 2890,
      });

    const after = computeStats();
    // Stats aggregate voice_calls with outcome='recovered' into totalRealizedCents.
    expect(after.totalRealizedCents).toBe(before.totalRealizedCents + 2890);
  });
});
