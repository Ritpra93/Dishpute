# Dishpute

**The AI dispute co-pilot for restaurants on delivery platforms.**

`$892 recovered · 22 disputes · 1 restaurant · 24 hours`

---

## What it does

Restaurants lose $10K–$50K/year to automated error charges from DoorDash — applied instantly whenever a customer reports a missing or wrong item, with no human review. Dishpute runs inside the restaurant's authenticated browser session, reads the error charge queue, and uses Claude AI to classify every charge and draft a dispute response. Worthy disputes are submitted automatically; denials get escalated via an ElevenLabs voice agent that calls DoorDash support live.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| AI classification | Claude Sonnet 4.6 — merit scoring + dispute drafting |
| Browser automation | TinyFish — runs inside the merchant's authenticated session |
| Voice escalation | ElevenLabs Conversational AI + Twilio |
| Database | SQLite via `better-sqlite3` |
| Payments | Stripe Connect (contingency payouts) |
| Monorepo | pnpm workspaces |

---

## Repo structure

```
packages/
  types/        Shared TypeScript contracts, DB schema, fixture data
  classifier/   Claude-powered merit scoring and dispute drafting
  scraper/      TinyFish browser automation wrapper
apps/
  web/          Merchant dashboard + mock DoorDash portal (Next.js 16)
  voice/        ElevenLabs + Twilio voice escalation service (Express)
```

---

## Getting started

```bash
pnpm install

# 2. Copy env templates and fill in keys (each app reads its own .env.local)
cp .env.example .env.local
cp apps/voice/.env.local.example apps/voice/.env.local
# apps/web reads its own .env.local — see "Wiring voice → web" below.

# 3. Build shared packages
pnpm -F @counter/types build

# 4. Seed the demo database
pnpm seed

# 5. Run the two apps in separate terminals
pnpm dev:web     # Next.js on :3000
pnpm dev:voice   # Express on :4000 (needs ngrok tunnel)
```

Copy `.env.example` to `.env.local` and fill in API keys before running.

For the voice service, in a third terminal:
```bash
ngrok http 4000
```
Copy the `https://...ngrok-free.app` URL and set `NGROK_PUBLIC_URL` in `apps/voice/.env.local`. Update the ElevenLabs agent's webhook URLs to point at the new ngrok URL.

### Wiring voice → web

For real voice escalation (instead of stubbed responses), `apps/web/.env.local` needs:

```bash
VOICE_ESCALATE_URL=http://localhost:4000/calls/outbound
NEXT_PUBLIC_VOICE_URL=http://localhost:4000
DOORDASH_SUPPORT_NUMBER=+1XXXXXXXXXX        # E.164, must be in voice's ALLOWED_CALL_NUMBERS
VOICE_SHARED_SECRET=<same value as apps/voice/.env.local>
```

Generate a fresh shared secret with `openssl rand -hex 32` and use the **same value** in both `.env.local` files. See "Security" below.

## Security

The voice service intentionally exposes a public ngrok URL during the demo, so it ships with a few hardening gates that you should not turn off:

- **Shared-secret auth** on `/calls/outbound` and `/calls/history` — set `VOICE_SHARED_SECRET` in both `apps/voice/.env.local` **and** `apps/web/.env.local`. Same value on both sides. If unset, the voice service logs a `[auth] UNAUTHENTICATED` warning at boot and skips the check (dev fallback) — never deploy without the secret set.
- **CORS allowlist** — `WEB_ORIGIN` in `apps/voice/.env.local` (comma-separated) restricts which origins can reach the voice service from a browser. Default `http://localhost:3000`.
- **Phone-number allowlist** — `ALLOWED_CALL_NUMBERS` in `apps/voice/.env.local` (comma-separated E.164) limits which numbers `/calls/outbound` can dial. Falls back to `DOORDASH_SUPPORT_NUMBER` as a single-number allowlist if unset.
- **Rate limiting** — `/calls/outbound` is capped at 10 requests / 5 minutes per IP; `/tools/*` at 60/minute. Both enforced unconditionally.
- **Webhook HMAC** — `/webhooks/elevenlabs/post-call` verifies the `ElevenLabs-Signature` header against `ELEVENLABS_WEBHOOK_SECRET` before mutating any state.

Tests for these gates live in `apps/voice/test/auth.test.ts` and `apps/voice/test/hardening.test.ts`. Run with `pnpm -F @counter/voice test`.

## Team

| Name | School |
|---|---|
| Aneesh Bhimavarapu | University of St. Thomas |
| Ritesh Prabhu | University of Minnesota |
| Ravindu Ranasinghe | University of Minnesota |
| Eric He | University of Minnesota |

---

Built at O1 Summit 2026 · 24 hours · Claude Code
