import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Mock ElevenLabs outbound-call before importing the server so routes see the mock.
vi.mock("../src/elevenlabs", () => ({
  initiateOutboundCall: vi.fn(async () => ({
    success: true,
    conversation_id: "conv_mock_12345",
    callSid: "CAmockmockmockmockmockmockmockmock",
  })),
}));

// Mock the ElevenLabs SDK webhooks.constructEvent so the post-call route
// doesn't need a valid HMAC signature. Real SDK returns a Promise — mock
// matches that contract (the route awaits it).
vi.mock("@elevenlabs/elevenlabs-js", () => ({
  ElevenLabsClient: vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: async (rawBody: string) => JSON.parse(rawBody),
    },
  })),
}));

// Point the voice server at an isolated temp DB so tests don't clobber the
// hackathon's shared counter.db.
process.env.DB_PATH = "/tmp/counter-voice-smoke.db";

import { createApp } from "../src/server";
import { getDb } from "../src/db";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no address");
  baseUrl = `http://127.0.0.1:${addr.port}`;

  // Seed a dispute candidate so the post-call webhook's INSERT INTO voice_calls
  // doesn't trip the FOREIGN KEY constraint. The real demo seeds this via
  // apps/web's seed-demo script hitting the same counter.db.
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO dispute_candidates (
        id, platform, order_id, charge_type, charge_amount_cents,
        items_reported_json, customer_comment, order_timestamp, charge_timestamp,
        dispute_deadline, portal_url, raw_text, scraped_at
      ) VALUES (
        'disp_smoke_test', 'doordash', 'ord_smoke', 'missing_item', 1000,
        '[]', NULL, '2026-04-18T00:00:00Z', '2026-04-18T00:00:00Z',
        '2026-05-02T00:00:00Z', '/mock-portal/disputes/disp_smoke_test', 'smoke-test candidate',
        '2026-04-18T00:00:00Z'
      )`,
    )
    .run();

  // Seed a classification so tools/lookup_case can return real charge data
  // and the webhook's recoveredCents roll-up path has a recoverable amount.
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO classifications (
        candidate_id, should_dispute, merit_score, reasoning, resolved_charge_type,
        recoverable_cents, drafted_dispute_text, evidence_citations_json, generated_at
      ) VALUES (
        'disp_smoke_test', 1, 85, 'POS confirms items packed and dispatched.',
        'missing_item', 900, 'Drafted text.', '[]', '2026-04-18T00:00:00Z'
      )`,
    )
    .run();
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

describe("GET /health", () => {
  it("returns ok", async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });
});

describe("GET /api/vanta/trust-center", () => {
  it("returns the mocked Vanta payload with expected shape", async () => {
    const res = await fetch(`${baseUrl}/api/vanta/trust-center`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.organization).toBe("Counter");
    expect(body.controls.total).toBeGreaterThan(0);
    expect(Array.isArray(body.frameworks)).toBe(true);
    expect(body.frameworks.length).toBeGreaterThan(0);
    expect(Array.isArray(body.integrations)).toBe(true);
  });
});

describe("POST /tools/lookup_case", () => {
  it("returns a concise, speakable case summary", async () => {
    const res = await fetch(`${baseUrl}/tools/lookup_case`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId: "31188" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.caseNumber).toBe("31188");
    expect(body.merchantName).toBeTruthy();
    expect(body.evidenceSummary).toBeTruthy();
  });

  it("handles missing caseId gracefully (returns 200 with fallback)", async () => {
    const res = await fetch(`${baseUrl}/tools/lookup_case`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    // ElevenLabs retries only on 5xx — 4xx would kill the conversation.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.error || body.evidenceSummary).toBeTruthy();
  });
});

describe("POST /tools/reference_evidence", () => {
  it("returns citations array", async () => {
    const res = await fetch(`${baseUrl}/tools/reference_evidence`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId: "31188" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.citations)).toBe(true);
    expect(body.citations.length).toBeGreaterThan(0);
  });
});

describe("POST /tools/escalate_to_supervisor", () => {
  it("returns an escalation ticket ID", async () => {
    const res = await fetch(`${baseUrl}/tools/escalate_to_supervisor`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "Rep refused", caseId: "31188" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.escalationTicketId).toMatch(/^ESC-/);
  });
});

describe("POST /calls/outbound", () => {
  it("accepts the contract payload from apps/web and returns a VoiceCallRecord shape", async () => {
    const res = await fetch(`${baseUrl}/calls/outbound`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        toNumber: "+15551234567",
        candidateId: "disp_0008",
        caseNumber: "4561",
        merchantName: "House of Curry",
        denialReason: "Insufficient evidence",
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.candidateId).toBe("disp_0008");
    expect(body.elevenLabsConversationId).toBe("conv_mock_12345");
    expect(body.twilioCallSid).toMatch(/^CA/);
    expect(body.startedAt).toBeTruthy();
    expect(new Date(body.startedAt).toString()).not.toBe("Invalid Date");
  });
});

describe("POST /webhooks/elevenlabs/post-call", () => {
  it("accepts post_call_transcription events, persists to voice_calls, returns 200", async () => {
    const event = {
      type: "post_call_transcription",
      event_timestamp: Math.floor(Date.now() / 1000),
      data: {
        conversation_id: "conv_test_9876",
        agent_id: "agent_test",
        status: "done",
        transcript: [
          { role: "agent", message: "Hi, this is an automated agent", time_in_call_secs: 0 },
          { role: "user", message: "Sure, what's the case number?", time_in_call_secs: 3 },
        ],
        analysis: { call_successful: "success", transcript_summary: "Case updated." },
        conversation_initiation_client_data: {
          dynamic_variables: { case_id: "disp_smoke_test" },
        },
      },
    };
    const res = await fetch(`${baseUrl}/webhooks/elevenlabs/post-call`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "ElevenLabs-Signature": "test-sig-mocked",
      },
      body: JSON.stringify(event),
    });
    expect(res.status).toBe(200);

    // Verify the row landed in SQLite with the expected outcome.
    const row = getDb()
      .prepare(
        `SELECT candidate_id, eleven_labs_conversation_id, call_outcome, transcript_json
         FROM voice_calls WHERE eleven_labs_conversation_id = ?`,
      )
      .get("conv_test_9876") as
      | {
          candidate_id: string;
          eleven_labs_conversation_id: string;
          call_outcome: string | null;
          transcript_json: string | null;
        }
      | undefined;
    expect(row).toBeTruthy();
    expect(row?.candidate_id).toBe("disp_smoke_test");
    expect(row?.call_outcome).toBe("recovered");
    expect(row?.transcript_json).toBeTruthy();
    const transcript = JSON.parse(row!.transcript_json!);
    expect(Array.isArray(transcript)).toBe(true);
    expect(transcript.length).toBe(2);
    expect(transcript[0].role).toBe("agent");
  });

  it("returns 200 even on missing signature (ElevenLabs never retries 4xx)", async () => {
    const res = await fetch(`${baseUrl}/webhooks/elevenlabs/post-call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "noop", data: {} }),
    });
    expect(res.status).toBe(200);
  });

  it("recovered outcome writes the classification's recoverable_cents into voice_calls", async () => {
    const event = {
      type: "post_call_transcription",
      event_timestamp: Math.floor(Date.now() / 1000),
      data: {
        conversation_id: "conv_recov_1",
        agent_id: "agent_test",
        status: "done",
        transcript: [],
        analysis: { call_successful: "success" },
        conversation_initiation_client_data: {
          dynamic_variables: { case_id: "disp_smoke_test" },
        },
      },
    };
    const res = await fetch(`${baseUrl}/webhooks/elevenlabs/post-call`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "ElevenLabs-Signature": "test-sig-mocked",
      },
      body: JSON.stringify(event),
    });
    expect(res.status).toBe(200);

    const row = getDb()
      .prepare(
        `SELECT recovered_cents, call_outcome FROM voice_calls
         WHERE eleven_labs_conversation_id = ?`,
      )
      .get("conv_recov_1") as
      | { recovered_cents: number | null; call_outcome: string | null }
      | undefined;
    expect(row?.call_outcome).toBe("recovered");
    // classification seeded with recoverable_cents = 900
    expect(row?.recovered_cents).toBe(900);
  });
});

describe("GET /calls/history", () => {
  it("returns the voice_calls rows in reverse-chronological order", async () => {
    const res = await fetch(`${baseUrl}/calls/history`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{
      candidateId: string;
      elevenLabsConversationId: string;
      transcript: unknown;
    }>;
    expect(Array.isArray(body)).toBe(true);
    // The two webhook tests above seeded rows for disp_smoke_test.
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].candidateId).toBe("disp_smoke_test");
  });
});

describe("GET /calls/status/:candidateId", () => {
  it("returns the latest call for a candidate", async () => {
    const res = await fetch(`${baseUrl}/calls/status/disp_smoke_test`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { candidateId: string; transcript: unknown };
    expect(body.candidateId).toBe("disp_smoke_test");
  });

  it("returns 404 when no call exists for the candidate", async () => {
    const res = await fetch(`${baseUrl}/calls/status/disp_no_such_id`);
    expect(res.status).toBe(404);
  });
});

describe("POST /tools/lookup_case (DB-backed)", () => {
  it("returns real charge data for a seeded case ID", async () => {
    const res = await fetch(`${baseUrl}/tools/lookup_case`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId: "disp_smoke_test" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.caseNumber).toBe("disp_smoke_test");
    // charge_amount_cents = 1000 → "$10.00"
    expect(body.chargeAmount).toBe("$10.00");
    expect(body.chargeType).toBe("missing_item");
    expect(body.evidenceSummary).toContain("POS");
  });
});
