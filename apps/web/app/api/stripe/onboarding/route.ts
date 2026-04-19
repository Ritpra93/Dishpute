import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { parseJson } from "@/lib/parse-request";
import { rateLimit, requireApiKey } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

const OnboardingRequestSchema = z.object({
  email: z.string().email().max(254).optional(),
  businessName: z.string().max(200).optional(),
});

/**
 * Stripe Connect onboarding link generator.
 *
 * Behaves in two modes:
 *   1. Live — when STRIPE_SECRET_KEY is set, creates a real Express account
 *      and returns the hosted onboarding URL.
 *   2. Mock — when STRIPE_SECRET_KEY is missing, returns a deterministic
 *      mock URL so the UI can demo without a Stripe account configured.
 */

export async function POST(request: Request) {
  const rl = rateLimit(request, "stripe-onboarding", {
    limit: 5,
    windowMs: 60_000,
  });
  if (rl) return rl;
  const auth = requireApiKey(request);
  if (auth) return auth;

  const parsed = await parseJson(request, OnboardingRequestSchema);
  if (!parsed.ok) return parsed.response;

  const email = parsed.data.email ?? "demo@houseofcurry.com";
  const businessName = parsed.data.businessName ?? "House of Curry";

  const secret = process.env.STRIPE_SECRET_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!secret) {
    return NextResponse.json({
      mode: "mock",
      url: `${baseUrl}/onboarding?stripe=mock&email=${encodeURIComponent(email)}`,
      accountId: "acct_mock_demo",
      message:
        "STRIPE_SECRET_KEY not set — returning a mock onboarding URL for the demo.",
    });
  }

  try {
    // Keep this pinned apiVersion in lockstep with the apps/web/app/api/stripe/
    // webhook/route.ts pin AND with the "API version" set on the Stripe
    // Dashboard → Developers → Events endpoint. A mismatch causes webhook
    // payloads to be delivered in a different shape than the SDK's generated
    // types expect, which can manifest as silent field-missing bugs rather
    // than a crash. Bump all three together.
    const stripe = new Stripe(secret, { apiVersion: "2025-02-24.acacia" });
    const account = await stripe.accounts.create({
      type: "express",
      email,
      business_profile: { name: businessName },
      capabilities: {
        transfers: { requested: true },
      },
    });
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${baseUrl}/onboarding?refresh=1`,
      return_url: `${baseUrl}/onboarding?return=1`,
      type: "account_onboarding",
    });

    return NextResponse.json({
      mode: "live",
      url: link.url,
      accountId: account.id,
    });
  } catch (err) {
    console.error("[stripe/onboarding] account creation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Stripe onboarding failed" },
      { status: 502 }
    );
  }
}
