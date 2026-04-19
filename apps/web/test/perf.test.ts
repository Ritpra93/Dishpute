/**
 * P5 — Performance sanity checks.
 *
 * Not benchmarks — floor-level assertions that the demo's timing budget
 * holds. If any of these regress, the stage demo gets bored/awkward.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { cleanupDb, callJsonRoute, useTempDb } from "./helpers";

const DB_PATH = useTempDb("perf");

const { createMockScraper } = await import("@counter/scraper");
const { createMockClassifier } = await import("@counter/classifier");
const { FIXTURE_DISPUTES } = await import("@counter/types");
const { resetAllTables } = await import("@/lib/repo");
const scanRoute = await import("@/app/api/scan/route");
const submitAllRoute = await import("@/app/api/disputes/submit-all/route");

beforeAll(() => resetAllTables());
afterAll(() => cleanupDb(DB_PATH));

describe("P5 — Demo timing budgets", () => {
  it("POST /api/scan with SCRAPER_MODE=cache completes in < 5s", async () => {
    process.env.SCRAPER_MODE = "cache";
    try {
      const t0 = Date.now();
      const { status, body } = await callJsonRoute<{ totalFound: number }>(
        scanRoute.POST,
        "http://localhost/api/scan",
        { platform: "doordash", reset: true },
      );
      const ms = Date.now() - t0;
      expect(status).toBe(200);
      expect(body.totalFound).toBe(30);
      // Mock scraper simulates 800ms latency; classifier mock is 0ms.
      expect(ms).toBeLessThan(5_000);
      console.log(`[perf] /api/scan (cache mode) = ${ms}ms`);
    } finally {
      delete process.env.SCRAPER_MODE;
    }
  });

  it("POST /api/disputes/submit-all 22 disputes completes in < 5s (mock)", async () => {
    const t0 = Date.now();
    const { status, body } = await callJsonRoute<{ submitted: number }>(
      submitAllRoute.POST,
      "http://localhost/api/disputes/submit-all",
    );
    const ms = Date.now() - t0;
    expect(status).toBe(200);
    expect(body.submitted).toBe(22);
    // Mock scraper has min(400, latency/3) = min(400, 0/3) = 0ms per submit.
    // Real TinyFish would take ~22 × 2s = ~45s; the demo uses the mock path.
    expect(ms).toBeLessThan(5_000);
    console.log(`[perf] /api/disputes/submit-all (22 disputes) = ${ms}ms`);
  });

  it("createMockClassifier().classifyMany(30) completes in < 500ms", async () => {
    const classifier = createMockClassifier();
    const t0 = Date.now();
    const results = await classifier.classifyMany(FIXTURE_DISPUTES);
    const ms = Date.now() - t0;
    expect(results).toHaveLength(30);
    // Pure in-memory lookup — should be instant. Real Claude target is 8s.
    expect(ms).toBeLessThan(500);
    console.log(`[perf] mock classifyMany(30) = ${ms}ms`);
  });

  it("createMockScraper().listOpenDisputes() with no latency < 50ms", async () => {
    const scraper = createMockScraper({ latencyMs: 0 });
    const t0 = Date.now();
    const disputes = await scraper.listOpenDisputes({
      merchantId: "merchant_hoc",
      platform: "doordash",
    });
    const ms = Date.now() - t0;
    expect(disputes).toHaveLength(30);
    expect(ms).toBeLessThan(50);
    console.log(`[perf] mock listOpenDisputes(0ms-latency) = ${ms}ms`);
  });

  it("Dollar-counter animation duration is 1.4s (code constant, not runtime)", () => {
    // The demo script expects the counter to finish tweening quickly enough
    // to not drag the beat. Assert by reading the source — changing this
    // constant requires updating the demo script.
    const counterFile = fs.readFileSync(
      path.resolve(__dirname, "../components/dashboard/dollar-counter.tsx"),
      "utf-8",
    );
    expect(counterFile).toMatch(/duration:\s*animated\s*\?\s*1\.4/);
  });
});
