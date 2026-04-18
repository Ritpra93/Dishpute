# Sponsor Prizes

Judges smell bolt-on sponsor usage instantly. Every integration below is load-bearing — if you ripped it out, the product would stop working. That's the scoring rubric.

## Primary targets (optimize for these)

### SeedLegals + StarterYou (startup potential — the main prizes)

These are our main targets. Both judged on:
1. Specific, defensible ICP
2. Real revenue model with plausible ACV
3. Bottom-up TAM math
4. Moat that isn't "we're faster"
5. Team that could ship this as a company

**What we tell these judges:**

- **ICP one-liner:** Operators of 1–20 location restaurant groups doing ≥$20K/mo on delivery.
- **Revenue math:** 20% contingency × $15K/yr recovered per mid-size merchant = $3K ACV. 500K US restaurants × 30% penetration × $3K = $450M realistic SAM.
- **Moat:** ToS + architecture. Co-pilot running in the merchant's session is the only compliant path. That requires TinyFish-grade browser infra. Two-year moat minimum.
- **Why 4 people × Claude Code in 24 hours:** Agent-native dev stack lets us replace what used to be 5 engineers × 6 months. We can reach $1M ARR before any competitor finishes hiring.
- **What the $5K unlocks:** Stripe Atlas + 4 months of DoorDash pilot testing + TinyFish production spend. Cash-flow positive by month 6 on contingency alone.

### TinyFish (core moat — $1,000 + credits)

**Why Counter needs it:** DoorDash, UberEats, and Grubhub have no public merchant APIs for dispute submission. Playwright gets fingerprinted in production. TinyFish's cloud-hosted browser agents with residential proxies, stealth, and persistent sessions are the only way to run authenticated workflows at scale across thousands of merchants. Rip TinyFish out and Counter can't ship.

**Where it shows up in code:** `packages/scraper/src/tinyfish.ts`. All public functions (`listOpenDisputes`, `submitDispute`, `scrapeOutcomes`) are TinyFish-powered via `https://agent.tinyfish.ai/v1/automation/run-sse`.

**Demo moment:** Beat 2 — the live scan. Judges watch 30 disputes populate in 40 seconds. We explicitly call it out: "30 disputes scraped in 40 seconds via a TinyFish cloud browser agent — running inside the merchant's own authenticated session."

**Submission checklist:**
- [ ] Authentic use of TinyFish REST API with `X-API-Key`
- [ ] Scraping flow demonstrates the "authenticated session" value proposition
- [ ] TinyFish mentioned by name in the pitch
- [ ] Optional: `@tiny-fish/cli` MCP server registered in `.mcp.json` so Claude Code itself uses TinyFish during development — makes the "built with TinyFish" story authentic

### ElevenLabs (voice escalation)

**Why Counter needs it:** Denied disputes require human escalation via merchant support phone queues. Restaurant operators lose 20–40 min per call during dinner rush, which is why most denials never get re-appealed. A voice agent handling this autonomously is the product, not a feature.

**Where it shows up in code:** `apps/voice/` is 100% ElevenLabs. Agent created in the dashboard with the native Twilio integration, configured with 3 function-calling tools (`lookup_case`, `reference_evidence`, `escalate_to_supervisor`).

**Demo moment:** Beat 4 — live outbound call on stage, ~60 seconds. Judges hear the agent navigate a real conversation with function calls mid-dialogue. This is the cinematic moment.

**Submission checklist:**
- [ ] Agent configured in ElevenLabs dashboard (not programmatic — use the UI)
- [ ] Native Twilio integration (NOT custom Media Streams WebSocket)
- [ ] At least 2 function-calling tools used during the call
- [ ] Post-call webhook with signature verification parsing transcript
- [ ] Pre-recorded backup audio for wifi-fail fallback
- [ ] Agent identifies as "automated agent calling on behalf of House of Curry" — honest disclosure, not pretending to be human

### Stripe (contingency payouts)

**Why Counter needs it:** The business model is "we take 20% of recovered funds." That requires splitting recovered funds — platform deposits to merchant, we pull our fee. Stripe Connect handles this. Without Stripe, monetization is manual invoicing, which is not a startup.

**Where it shows up in code:**
- `apps/web/app/api/stripe/onboarding/route.ts` — Stripe Connect Express onboarding
- `apps/web/app/onboarding/page.tsx` — onboarding UI using magic test tokens
- Dashboard shows "Counter fee (pending): $178.40" as a live line item
- Webhook stub logs events (we don't process them for the demo)

**Demo moment:** Beat 6 — "Stripe Connect handles the contingency payouts automatically — the merchant's recovery hits their account, we pull our 20%, same day."

**Submission checklist:**
- [ ] Stripe Connect Express onboarding visible in the app
- [ ] Webhook handler scaffolded (stub is fine)
- [ ] Contingency fee line visible in dashboard
- [ ] Stripe test keys in `.env.local`

## Skipping these prizes

### Vanta
No self-serve trial. Mocked MCP server with realistic fixtures. Narrative is still included in the pitch (Beat 7: trust center) but not a prize target.

### AWS Kiro
Spec-driven workflow adds too much overhead for a beginner team in 24 hours. Cleaner to skip entirely than half-implement.

## Pitch slide outline (if a deck is required)

Maximum 6 slides — judges' attention dies at slide 7.

1. **The problem** — screenshot of a merchant's DoorDash dispute queue with $1,200 in red charges
2. **The insight** — ToS prohibits 3rd-party submission; our architecture is the only compliant path
3. **The product** — 3 screens: scan, classify, voice escalate
4. **The model** — 20% contingency, $3K ACV, $450M SAM
5. **Why now** — agentic AI infra + platform fee inflation + regulatory scrutiny on delivery platforms
6. **The ask** — $5K unlocks 4-month pilot with House of Curry network + 3 sister restaurants
