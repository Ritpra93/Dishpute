import type { Server } from "http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/server.js";

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
    expect(body.ok).toBe(true);
    expect(body.service).toBe("@counter/voice");
  });
});

describe("POST /calls/outbound (stub)", () => {
  it("returns a VoiceCallRecord-shaped payload", async () => {
    const res = await fetch(`${baseUrl}/calls/outbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId: "dispute_4472",
        phoneNumber: "+15551234567",
        context: {
          candidateId: "dispute_4472",
          shouldDispute: true,
          meritScore: 89,
          reasoning: "POS shows all items dispatched.",
          resolvedChargeType: "missing_item",
          recoverableCents: 2840,
          draftedDisputeText: "All items were packed.",
          evidenceCitations: ["POS 4472 timestamp 19:38"],
          generatedAt: new Date().toISOString(),
          outcome: {
            candidateId: "dispute_4472",
            outcome: "denied",
            refundedCents: 0,
            escalateToVoice: true,
          },
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.candidateId).toBe("dispute_4472");
    expect(typeof body.elevenLabsConversationId).toBe("string");
    expect(body.elevenLabsConversationId.length).toBeGreaterThan(0);
    expect(typeof body.twilioCallSid).toBe("string");
    expect(body.twilioCallSid.startsWith("CA")).toBe(true);
    expect(typeof body.startedAt).toBe("string");
    expect(new Date(body.startedAt).toString()).not.toBe("Invalid Date");
  });

  it("rejects requests missing required fields", async () => {
    const res = await fetch(`${baseUrl}/calls/outbound`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: "dispute_4472" }),
    });
    expect(res.status).toBe(400);
  });
});
