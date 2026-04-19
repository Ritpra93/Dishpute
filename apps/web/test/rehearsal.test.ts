/**
 * P4 — Rehearsal simulator.
 *
 * ONE integration test that replays the entire demo sequence beat-by-beat
 * against real code paths, with:
 *   - apps/web routes invoked directly
 *   - apps/voice Express app started on an ephemeral port in the same process
 *   - shared counter.db in a temp path
 *   - ElevenLabs outbound-call API mocked at the fetch level (no real call)
 *
 * If this test passes: the demo works.
 * If this test fails: the demo breaks on stage.
 *
 * Run with: pnpm -F @counter/web test:demo
 */
import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { cleanupDb, callJsonRoute, getJsonRoute, useTempDb } from "./helpers";

const DB_PATH = useTempDb("rehearsal");

// Real webhook secret — we compute a matching HMAC signature in the test
// body so the SDK's real constructEvent verifies successfully.
const WEBHOOK_SECRET = "wsec_rehearsal_test_secret";
process.env.ELEVENLABS_WEBHOOK_SECRET = WEBHOOK_SECRET;

function signElevenLabsBody(rawBody: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const digest = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(`${ts}.${rawBody}`)
    .digest("hex");
  return `t=${ts},v0=${digest}`;
}

// Intercept the ElevenLabs outbound-call API at the fetch layer — no phone
// rings, no money spent.
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (url.includes("api.elevenlabs.io/v1/convai/twilio/outbound-call")) {
    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: "conv_rehearsal_42",
        callSid: "CArehearsaltest",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }
  return originalFetch(input as RequestInfo, init);
}) as typeof fetch;

const { resetAllTables, computeStats, listEnrichedDisputes } = await import("@/lib/repo");
const scanRoute = await import("@/app/api/scan/route");
const disputesRoute = await import("@/app/api/disputes/route");
const statsRoute = await import("@/app/api/stats/route");
const submitAllRoute = await import("@/app/api/disputes/submit-all/route");
const escalateRoute = await import("@/app/api/disputes/[id]/escalate/route");

// Start the voice app in-process. We type structurally on `.listen` instead of
// importing `import("express").Express` so apps/web doesn't need express in its
// own deps just to run this rehearsal test.
type ListenableApp = {
  listen(port: number, cb?: () => void): Server;
};
const voiceServerMod = await import("../../../apps/voice/src/server");
const createVoiceApp = voiceServerMod.createApp as () => ListenableApp;

let voiceServer: Server;
let voiceBaseUrl: string;

beforeAll(async () => {
  resetAllTables();
  const app = createVoiceApp();
  await new Promise<void>((resolve) => {
    voiceServer = app.listen(0, () => resolve());
  });
  const addr = voiceServer.address();
  if (!addr || typeof addr === "string") throw new Error("no voice address");
  voiceBaseUrl = `http://127.0.0.1:${addr.port}`;

  process.env.VOICE_ESCALATE_URL = `${voiceBaseUrl}/calls/outbound`;
  process.env.DOORDASH_SUPPORT_NUMBER = "+15551234567";
});

afterAll(async () => {
  delete process.env.VOICE_ESCALATE_URL;
  delete process.env.DOORDASH_SUPPORT_NUMBER;
  if (voiceServer) {
    await new Promise<void>((resolve, reject) =>
      voiceServer.close((err) => (err ? reject(err) : resolve())),
    );
  }
  globalThis.fetch = originalFetch;
  cleanupDb(DB_PATH);
});

describe("Rehearsal — the full demo walk-through", () => {
  it("walks Beats 2 → 4 end-to-end and lands on the $892 / 22-submitted / 1-escalated story", async () => {
    // ─── Beat 2: Scan populates the queue ──────────────────────────────
    const scanT0 = Date.now();
    const scanRes = await callJsonRoute<{ totalFound: number; classified: number }>(
      scanRoute.POST,
      "http://localhost/api/scan",
      { platform: "doordash", reset: true },
    );
    const scanMs = Date.now() - scanT0;
    expect(scanRes.status).toBe(200);
    expect(scanRes.body.totalFound).toBe(30);
    expect(scanRes.body.classified).toBe(30);
    expect(scanMs).toBeLessThan(5_000);

    const disputes = await getJsonRoute<Array<{ id: string }>>(
      disputesRoute.GET,
      "http://localhost/api/disputes",
    );
    expect(disputes.status).toBe(200);
    expect(disputes.body).toHaveLength(30);

    // ─── Merit math: 22 at >=70, total $892 ─────────────────────────────
    const enriched = listEnrichedDisputes();
    const highMerit = enriched.filter(
      (d) => d.classification?.shouldDispute && d.classification.meritScore >= 70,
    );
    expect(highMerit).toHaveLength(22);
    const sum = highMerit.reduce((s, d) => s + (d.classification?.recoverableCents ?? 0), 0);
    expect(sum).toBe(89_200);

    // ─── Beat 3: Submit all ─────────────────────────────────────────────
    const submitT0 = Date.now();
    const submitRes = await callJsonRoute<{ submitted: number }>(
      submitAllRoute.POST,
      "http://localhost/api/disputes/submit-all",
    );
    const submitMs = Date.now() - submitT0;
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.submitted).toBe(22);
    expect(submitMs).toBeLessThan(5_000);

    const stats = await getJsonRoute<{
      totalDisputed: number;
      totalSubmittedRecoverableCents: number;
    }>(statsRoute.GET, "http://localhost/api/stats");
    expect(stats.body.totalDisputed).toBe(22);
    expect(stats.body.totalSubmittedRecoverableCents).toBe(89_200);

    // ─── Beat 4: Escalate the denied case to voice ──────────────────────
    const denied = listEnrichedDisputes().filter(
      (d) => d.outcome?.outcome === "denied" && d.outcome.escalateToVoice,
    );
    expect(denied.length).toBeGreaterThanOrEqual(1);
    const pick = denied[0]!;

    const escalateT0 = Date.now();
    const escRes = await callJsonRoute<{
      mode: string;
      conversationId?: string;
      callSid?: string;
      twilioCallSid?: string;
      payload: Record<string, string>;
    }>(
      escalateRoute.POST,
      `http://localhost/api/disputes/${pick.id}/escalate`,
      {},
      { params: Promise.resolve({ id: pick.id }) },
    );
    const escalateMs = Date.now() - escalateT0;
    expect(escRes.status).toBe(200);
    expect(escRes.body.mode).toBe("live");
    expect(escRes.body.conversationId).toBe("conv_rehearsal_42");
    expect(escRes.body.callSid).toBe("CArehearsaltest");
    expect(escRes.body.twilioCallSid).toBe("CArehearsaltest");
    expect(escRes.body.payload.toNumber).toBe("+15551234567");
    expect(escRes.body.payload.candidateId).toBe(pick.id);
    expect(escRes.body.payload.merchantName).toBe("House of Curry");
    expect(escalateMs).toBeLessThan(2_000);

    // ─── Post-call webhook: simulate ElevenLabs firing back with a transcript ──
    const event = {
      type: "post_call_transcription",
      event_timestamp: Math.floor(Date.now() / 1000),
      data: {
        conversation_id: "conv_rehearsal_42",
        agent_id: "agent_rehearsal",
        status: "done",
        transcript: [
          { role: "agent", message: `Hi, this is an automated agent calling about case ${escRes.body.payload.caseNumber}.`, time_in_call_secs: 0 },
          { role: "user", message: "Let me look that up.", time_in_call_secs: 2 },
          { role: "agent", message: "Thank you for reviewing.", time_in_call_secs: 55 },
        ],
        analysis: { call_successful: "success", transcript_summary: "Rep agreed to reopen the case." },
        conversation_initiation_client_data: {
          dynamic_variables: {
            case_id: pick.id,
            case_number: escRes.body.payload.caseNumber,
          },
        },
      },
    };
    const rawBody = JSON.stringify(event);
    const hookRes = await fetch(`${voiceBaseUrl}/webhooks/elevenlabs/post-call`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "ElevenLabs-Signature": signElevenLabsBody(rawBody),
      },
      body: rawBody,
    });
    expect(hookRes.status).toBe(200);

    // ─── Assert voice_calls row persisted via cross-app DB write ───────
    const { getDb } = await import("@/lib/db");
    const row = getDb()
      .prepare(
        `SELECT candidate_id, eleven_labs_conversation_id, call_outcome
         FROM voice_calls WHERE eleven_labs_conversation_id = ?`,
      )
      .get("conv_rehearsal_42") as
      | { candidate_id: string; eleven_labs_conversation_id: string; call_outcome: string }
      | undefined;
    expect(row).toBeTruthy();
    expect(row!.candidate_id).toBe(pick.id);
    expect(row!.call_outcome).toBe("recovered");

    // ─── Final stats: the escalated dispute should still carry an outcome row ─
    const finalStats = computeStats();
    const final = listEnrichedDisputes().find((d) => d.id === pick.id)!;
    expect(final.outcome?.outcome).toBe("denied");
    expect(final.outcome?.escalateToVoice).toBe(true);
    expect(Number.isFinite(finalStats.counterFeeCents)).toBe(true);

    // ─── Timing summary (printed for the report) ───────────────────────
    console.log(
      `[rehearsal] scan=${scanMs}ms submit-all=${submitMs}ms escalate=${escalateMs}ms ` +
        `disputes=${disputes.body.length} submitted=${submitRes.body.submitted} ` +
        `recoverableCents=${stats.body.totalSubmittedRecoverableCents}`,
    );
  });
});
