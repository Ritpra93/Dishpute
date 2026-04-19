/**
 * POST /api/stripe/webhook
 *
 * Verifies the Stripe webhook signature, persists `transfer.created` events
 * to `recovered_transfers`, and fans the persisted record out to live
 * subscribers (the dashboard recovered-today counter — the "V2 fan-out").
 *
 * Spec: docs/VERIFIED_APIS.md → Stripe Connect transfers.
 *
 * Required env:
 *   STRIPE_SECRET_KEY        (used to construct the SDK)
 *   STRIPE_WEBHOOK_SECRET    (used to verify signatures)
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { insertTransfer } from "@/lib/transfers/repo";
import { publishTransfer } from "@/lib/transfers/broker";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  const apiKey =
    process.env["STRIPE_SECRET_KEY"] ?? "sk_demo_unused_for_signature_verification";
  const body = await request.text();

  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 503 }
    );
  }
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  const stripe = new Stripe(apiKey, { apiVersion: "2025-02-24.acacia" });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type !== "transfer.created") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const transfer = event.data.object as Stripe.Transfer;
  const candidateId =
    (transfer.metadata?.candidate_id as string | undefined) ?? null;

  const persisted = insertTransfer({
    id: transfer.id,
    candidateId,
    amountCents: transfer.amount,
    currency: transfer.currency,
    destination:
      typeof transfer.destination === "string"
        ? transfer.destination
        : transfer.destination?.id ?? null,
    arrivedAt: new Date(transfer.created * 1000).toISOString(),
    livemode: event.livemode,
    rawEventId: event.id,
    rawPayload: transfer,
  });

  if (persisted) {
    publishTransfer(persisted);
    return NextResponse.json({ received: true, persisted: true });
  }

  return NextResponse.json({ received: true, persisted: false, duplicate: true });
}
