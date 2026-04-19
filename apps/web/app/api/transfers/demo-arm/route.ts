/**
 * POST /api/transfers/demo-arm
 *
 * Demo-only convenience: synthesises a `transfer.created` event end-to-end —
 * persists it through the same `insertTransfer` codepath the webhook uses and
 * fans it out to the dashboard SSE subscribers. Used during a live
 * presentation when no real Stripe Connect transfer is available.
 *
 * Disabled in production-locked mode unless `ALLOW_DEMO_ARM=1`.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/parse-request";
import { rateLimit, requireApiKey } from "@/lib/api-guard";
import { insertTransfer } from "@/lib/transfers/repo";
import { publishTransfer } from "@/lib/transfers/broker";

export const dynamic = "force-dynamic";

const Schema = z.object({
  amountCents: z.number().int().min(50).max(50_000_000).default(2400),
  candidateId: z.string().max(64).optional(),
  destination: z.string().max(64).default("acct_demo"),
});

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env["ALLOW_DEMO_ARM"] !== "1"
  ) {
    return NextResponse.json(
      { error: "Demo arm is disabled in production." },
      { status: 403 }
    );
  }

  const rl = rateLimit(request, "demo-arm", { limit: 30, windowMs: 60_000 });
  if (rl) return rl;
  const auth = requireApiKey(request);
  if (auth) return auth;

  const parsed = await parseJson(request, Schema);
  if (!parsed.ok) return parsed.response;

  const id = `tr_demo_${Date.now()}`;
  const eventId = `evt_demo_${Date.now()}`;
  const arrivedAt = new Date().toISOString();

  const persisted = insertTransfer({
    id,
    candidateId: parsed.data.candidateId ?? null,
    amountCents: parsed.data.amountCents,
    currency: "usd",
    destination: parsed.data.destination,
    arrivedAt,
    livemode: false,
    rawEventId: eventId,
    rawPayload: {
      id,
      object: "transfer",
      amount: parsed.data.amountCents,
      currency: "usd",
      destination: parsed.data.destination,
      metadata: { demo: "1", candidate_id: parsed.data.candidateId ?? "" },
      created: Math.floor(Date.now() / 1000),
    },
  });

  if (!persisted) {
    return NextResponse.json(
      { error: "Demo arm collision (try again)" },
      { status: 500 }
    );
  }

  publishTransfer(persisted);

  return NextResponse.json({ ok: true, transfer: persisted });
}
