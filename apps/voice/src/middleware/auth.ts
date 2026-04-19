import type { Request, Response, NextFunction } from "express";

/**
 * Shared-secret guard for server-to-server endpoints (apps/web → apps/voice).
 *
 * - **Production (`NODE_ENV=production`):** `VOICE_SHARED_SECRET` is **required**.
 *   If missing, protected routes return 503 so ngrok cannot accept unauthenticated
 *   outbound call requests.
 * - **Non-production:** If unset, logs once and allows requests (local demo /
 *   smoke tests without shared ceremony).
 *
 * Set the same secret in `apps/voice/.env.local` and `apps/web/.env.local`
 * (`x-counter-token` header on escalate).
 */
const SECRET = process.env["VOICE_SHARED_SECRET"];
const IS_PRODUCTION = process.env["NODE_ENV"] === "production";

let warned = false;
function warnIfMissing() {
  if (!SECRET && !warned) {
    warned = true;
    console.warn(
      "[auth] VOICE_SHARED_SECRET not set — server-to-server endpoints are UNAUTHENTICATED. " +
        "Set it in apps/voice/.env.local and apps/web/.env.local before exposing this service."
    );
  }
}

export function requireSharedSecret(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!SECRET) {
    if (IS_PRODUCTION) {
      res.status(503).json({
        error: "misconfigured",
        message:
          "VOICE_SHARED_SECRET must be set in production for outbound calls and protected routes.",
      });
      return;
    }
    warnIfMissing();
    next();
    return;
  }
  const provided = req.header("x-counter-token");
  if (provided !== SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
