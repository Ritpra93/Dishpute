import rateLimit from "express-rate-limit";

/**
 * Strict limiter for endpoints that cost real money / can be abused for harm.
 *
 * /calls/outbound triggers an ElevenLabs+Twilio call billed to our account, so
 * even with auth+allowlist in place we cap throughput per IP to blunt
 * credential-leak amplification. 10 calls / 5 minutes is well above any
 * legitimate demo cadence.
 */
export const outboundLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", scope: "calls/outbound" },
});

/**
 * Looser limiter for ElevenLabs-callable agent tools. ElevenLabs may legitimately
 * burst tool calls during a single conversation, so this caps per-IP bursts but
 * stays generous enough for normal use.
 */
export const toolsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", scope: "tools" },
});

/**
 * Limiter for the unauthenticated GET endpoints that expose per-conversation
 * call data (/calls/status/:candidateId, /calls/:id/audio, /calls/:id/
 * live-transcript). These are deliberately un-auth'd so the dashboard can read
 * them directly, but an attacker who learns a candidateId could otherwise
 * enumerate transcripts or drive egress bandwidth via /audio. 120 req/min per
 * IP covers a browser polling at 2s cadence (30 req/min) with ~4× headroom.
 */
export const callsReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "rate_limited", scope: "calls/read" },
});
