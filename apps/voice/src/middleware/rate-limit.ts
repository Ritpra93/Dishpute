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
