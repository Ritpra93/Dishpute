# Dishpute

Agentic dispute assistant for restaurants on food delivery platforms.

Restaurants lose $10K-$50K/year to DoorDash/UberEats/Grubhub missing-item chargebacks they never fight. Merchant portals are hostile by design - multi-step forms, no bulk actions, 14-day windows. Dishpute reads the dispute queue from inside the merchant's authenticated session, classifies and drafts every disputable charge with Claude, submits them, and escalates denials to support via an ElevenLabs voice agent.

Built at O1 Summit 2026. 24-hour hackathon, 4-person team.

---

## Demo

> 30 charges found, 22 disputable, $892 recovered — when one was denied, the voice agent called DoorDash support live on stage and resolved it.

---

## Architecture

```text
Next.js dashboard (apps/web)
        ↓
   SQLite ← classifier (packages/classifier) — Claude Sonnet 4.6 + Haiku 4.5
        ↓
   scraper (packages/scraper) — TinyFish browser automation
        ↓
   Mock DoorDash portal (served by apps/web)

Voice escalation:
apps/voice (Express) — ElevenLabs Agents + Twilio
```

Per-workspace detail lives in each package's `CLAUDE.md`.

---

## Tech Stack

- TypeScript + pnpm workspaces
- Next.js 16 App Router + Tailwind + shadcn/ui + motion
- better-sqlite3 (shared `counter.db` at repo root)
- TinyFish (browser automation) via REST+SSE
- Anthropic SDK — Claude Sonnet 4.6 / Haiku 4.5 with structured outputs + prompt caching
- ElevenLabs Conversational AI + Twilio native integration
- Stripe Connect (test mode)
- ngrok (tunneling)

---

## Repo Structure

```text
dishpute/
├── CLAUDE.md                   # Master context — start here
├── packages/
│   ├── types/                  # Shared TS contracts + SQL schema
│   ├── scraper/                # TinyFish wrapper (Worker 1)
│   └── classifier/             # Claude classifier (Worker 2)
└── apps/
    ├── web/                    # Next.js dashboard + mock portal (Worker 3)
    └── voice/                  # ElevenLabs voice escalation (Worker 4)
```

---

## Running Locally

Prerequisites: **Node 24 LTS**, **pnpm 9.15+**

```bash
# Install dependencies
pnpm install

# Set up env files (never commit real secrets)
cp .env.example .env.local
cp apps/voice/.env.local.example apps/voice/.env.local
# Create apps/web/.env.local — copy relevant vars from .env.example

# Seed the demo database
pnpm seed

# Run in separate terminals
pnpm dev:web     # Next.js → http://localhost:3000
pnpm dev:voice   # Express → http://localhost:4000
```

Open `http://localhost:3000/dashboard`.

Main nav: **Disputes**, **Warnings**, **Live**, **Ops**, **Calls**, **Trust**, **Onboarding**.

### Voice + ngrok

```bash
ngrok http 4000
```

Copy the forwarding URL into `apps/voice/.env.local` as `NGROK_PUBLIC_URL` and set it as the ElevenLabs agent webhook base URL.

### Wiring voice <-> web

Set in `apps/web/.env.local`:

```bash
VOICE_ESCALATE_URL=http://localhost:4000/calls/outbound
NEXT_PUBLIC_VOICE_URL=http://localhost:4000
DOORDASH_SUPPORT_NUMBER=+1XXXXXXXXXX # E.164; must match voice allowlist
VOICE_SHARED_SECRET=<same as apps/voice>
COUNTER_WEB_API_KEY=<32-byte hex>
```

Generate secrets with `openssl rand -hex 32`. `VOICE_SHARED_SECRET` must match `apps/voice/.env.local`. See `.env.example` for the full variable list.

### Tests

```bash
pnpm test:all
pnpm test:demo
pnpm -F @counter/voice test
```

---

## Security

### Voice service (`apps/voice`)

- **Shared secret** — `VOICE_SHARED_SECRET` sent as `x-counter-token` on server-to-server calls. In production (`NODE_ENV=production`), unset secret returns **503**.
- **CORS** — `WEB_ORIGIN` in `apps/voice/.env.local` (comma-separated). Defaults to `http://localhost:3000`.
- **Phone allowlist** — `ALLOWED_CALL_NUMBERS` or fallback `DOORDASH_SUPPORT_NUMBER` (E.164).
- **Rate limiting** — `/calls/outbound`: 10/5min per IP; unauthenticated read endpoints: 120/min; tools: 60/min.
- **Webhook verification** — `ElevenLabs-Signature` checked with `ELEVENLABS_WEBHOOK_SECRET` before persisting transcripts.
- **Input validation** — `conversationId` validated against `/^[A-Za-z0-9_-]{8,128}$/` before file path or upstream use.

### Web service (`apps/web`)

- **API key** — `COUNTER_WEB_API_KEY` sent as `x-counter-token` on privileged routes (`/api/scan`, `/api/disputes/*/submit`, `/api/disputes/*/escalate`, `/api/stripe/onboarding`, `/api/transfers/demo-arm`). Compared with `timingSafeEqual`.
- **Rate limiting** — per-route IP buckets: scan 10/min, submit 30/min, submit-all 3/min, escalate 5/min. Skipped in `NODE_ENV=test`.
- **Proxy validation** — `/api/calls/[conversationId]/audio` and `/api/calls/[conversationId]/live` reject malformed IDs with 400 before proxying.

### Classifier + scraper

- **Prompt injection hardening** — `buildUserMessage` wraps untrusted input in `<customer_comment>` and `<scraped_content>` tags; occurrences of those tokens inside untrusted input are stripped via `sanitizeUntrusted`.
- **System-prompt directive** — every Claude system prompt prepends `UNTRUSTED_INPUT_DIRECTIVE`, treating injection attempts as a fraud signal that lowers `meritScore`.
- **Goal sanitization** — LLM-drafted dispute text is stripped of control characters, fenced blocks, and delimiter tokens before being embedded in TinyFish goals.
- **ID validation** — `orderId`/`candidateId` validated against `/^[A-Za-z0-9_.:-]+$/` before interpolation.
- **SSRF allowlist** — `submitDispute` rejects `portalUrl` hosts outside the DoorDash/mock-portal allowlist.

### Secrets

See the **SECRET ROTATION CHECKLIST** in `.env.example` for all secrets and rotation commands.

---

## Team

Built at O1 Summit 2026 by a 4-person team using Claude Code. Shared contracts live in `packages/types`.

---

## Scope

- No live scraping of real merchant accounts — mock portal used for ToS safety and demo reliability
- No multi-tenant auth
- No real Vanta integration (mocked locally)

---

## License

Private. Not for redistribution.
