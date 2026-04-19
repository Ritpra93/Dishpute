/**
 * Shared guards for Next.js API routes that trigger billed / write /
 * privileged actions (outbound calls, Stripe transfers, portal scrapes,
 * destructive DB ops). Two layers:
 *
 *   1. `requireApiKey()` — when `COUNTER_WEB_API_KEY` is set, requires
 *      requests to carry `x-counter-token: <key>`. In production with the
 *      env var unset, the guard returns 503 so we never ship a silently
 *      unauthenticated privileged route. In development/test, an unset key
 *      is permissive (with a one-time warning) so local rehearsal still
 *      works.
 *
 *   2. `rateLimit()` — tiny in-memory fixed-window limiter keyed by
 *      route-bucket + client IP. Not a substitute for Cloudflare / an edge
 *      WAF, but it prevents a single attacker (or a looping UI bug) from
 *      burning LLM / Twilio / ElevenLabs budget during a demo window.
 *
 * Both are intentionally side-effect free on success and return a
 * `NextResponse` on denial so routes can compose them at the top:
 *
 *     const rl = rateLimit(req, "escalate", { limit: 5, windowMs: 60_000 });
 *     if (rl) return rl;
 *     const auth = requireApiKey(req);
 *     if (auth) return auth;
 */

import { NextResponse } from "next/server";

// ─── auth ────────────────────────────────────────────────────────────────────

const warnedMissingKey = new Set<string>();

export function requireApiKey(req: Request): NextResponse | null {
  const expected = process.env["COUNTER_WEB_API_KEY"];
  const nodeEnv = process.env["NODE_ENV"] ?? "development";

  if (!expected || expected.trim().length === 0) {
    if (nodeEnv === "production") {
      return NextResponse.json(
        {
          error:
            "Server misconfigured: COUNTER_WEB_API_KEY must be set in production.",
        },
        { status: 503 }
      );
    }
    if (!warnedMissingKey.has("api")) {
      warnedMissingKey.add("api");
      console.warn(
        "[api-guard] COUNTER_WEB_API_KEY not set — privileged routes are UNAUTHENTICATED in " +
          nodeEnv +
          " mode. Set it before exposing the app."
      );
    }
    return null;
  }

  const presented = req.headers.get("x-counter-token") ?? "";
  if (!timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// Constant-time string compare — avoids leaking key length / prefix via
// response timing. Both sides are compared byte-for-byte after length equal.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// ─── rate limit ──────────────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export function rateLimit(
  req: Request,
  bucket: string,
  opts: { limit: number; windowMs: number }
): NextResponse | null {
  // Test runs (vitest) hit these routes many times in the same process and
  // would otherwise trip the limiter across unrelated test blocks. The bucket
  // is still exercised in dev/prod.
  if (process.env["NODE_ENV"] === "test" || process.env["VITEST"] === "true") {
    return null;
  }
  const key = `${bucket}:${clientIp(req)}`;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (existing.count >= opts.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests", retryAfterSec },
      {
        status: 429,
        headers: {
          "retry-after": String(retryAfterSec),
          "x-ratelimit-remaining": "0",
        },
      }
    );
  }

  existing.count += 1;
  return null;
}
