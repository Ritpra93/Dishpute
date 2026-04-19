import type { Request, Response, NextFunction } from "express";

/**
 * Shared-secret guard for server-to-server endpoints (apps/web → apps/voice).
 *
 * Enforced only when VOICE_SHARED_SECRET is set. If unset, the middleware logs
 * a one-time warning at boot and lets requests through — this matches the
 * "stub when env unset" pattern already used in apps/web's escalate route, so
 * smoke/dev runs continue to work without ceremony.
 *
 * Production deployments MUST set VOICE_SHARED_SECRET on both apps/voice and
 * apps/web; without it, /calls/outbound is reachable by anyone who can hit the
 * ngrok URL — see docs/SECURITY_REVIEW H1.
 */
const SECRET = process.env["VOICE_SHARED_SECRET"];

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
  warnIfMissing();
  if (!SECRET) {
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
