# Counter

**Agentic dispute assistant for restaurants on food delivery platforms.**

Restaurants lose $10K–$50K per year to DoorDash/UberEats/Grubhub missing-item auto-charges they never dispute. Merchant portals are hostile by design — multi-step forms, no bulk actions, 14-day window. Counter is a co-pilot that reads the dispute queue from inside the merchant's authenticated session, classifies and drafts every disputable charge with Claude, submits them, and escalates denials to support via an ElevenLabs voice agent.

Built at O1 Summit 2026. 24-hour hackathon, 4-person team, built entirely with Claude Code.

## Demo

See `docs/DEMO_SCRIPT.md` for the full 10-minute demo. One-line summary:

> "30 charges found, 22 disputable, $892 recovered — and when one was denied, our agent called DoorDash support live on stage and resolved it."

## Architecture

```
Next.js dashboard (apps/web)
        ↓
   SQLite ← classifier (packages/classifier) — Claude Sonnet 4.6 + Haiku 4.5
        ↓
   scraper (packages/scraper) — TinyFish browser automation
        ↓
   Mock DoorDash portal (served by apps/web)

   Voice escalation:
   apps/voice (Express) — ElevenLabs Agents + Twilio native integration
```

Full detail: `docs/ARCHITECTURE.md`.

## Tech stack

- TypeScript + pnpm workspaces
- Next.js 16 App Router + Tailwind + shadcn/ui + motion
- better-sqlite3 (shared `counter.db` at repo root)
- TinyFish (browser automation) via REST+SSE
- Anthropic SDK — Claude Sonnet 4.6 / Haiku 4.5 with structured outputs + prompt caching
- ElevenLabs Conversational AI + Twilio native integration
- Stripe Connect (test mode)
- ngrok (tunneling)

Every version and API is pinned in `docs/VERIFIED_APIS.md`.

## Repo structure

```
counter/
├── CLAUDE.md                   # Master context — start here
├── START_HERE.md               # First 30 min of the hackathon
├── PRE_HACKATHON.md            # Account setup (before Saturday)
├── docs/                       # Planning + reference docs
├── packages/
│   ├── types/                  # Shared TS contracts + SQL schema
│   ├── scraper/                # TinyFish wrapper (Worker 1)
│   └── classifier/             # Claude classifier (Worker 2)
└── apps/
    ├── web/                    # Next.js dashboard + mock portal (Worker 3)
    └── voice/                  # ElevenLabs voice escalation (Worker 4)
```

## Running locally

Prerequisites: **Node 24 LTS**, **pnpm 9.15+**.

```bash
# 1. Install dependencies
pnpm install

# 2. Environment files (never commit real secrets)
cp .env.example .env.local                    # optional root copy for tooling
cp apps/voice/.env.local.example apps/voice/.env.local
# Create apps/web/.env.local — copy relevant vars from .env.example (voice URLs, Stripe, etc.)

# 3. Seed the demo database
pnpm seed

# 4. Run the apps (separate terminals)
pnpm dev:web     # Next.js → http://localhost:3000
pnpm dev:voice   # Express → http://localhost:4000
```

Open **http://localhost:3000/dashboard**.

Main nav: **Disputes**, **Warnings**, **Live**, **Ops**, **Calls**, **Trust**, **Onboarding**.

### Voice + ngrok (live webhooks / outbound calls)

In another terminal:

```bash
ngrok http 4000
```

Copy the `https://…` forwarding URL into `apps/voice/.env.local` as `NGROK_PUBLIC_URL`, and configure the ElevenLabs agent webhooks to use that base URL.

### Wiring voice ↔ web

For real escalation from the dashboard (not stubbed), set in **`apps/web/.env.local`**:

```bash
VOICE_ESCALATE_URL=http://localhost:4000/calls/outbound
NEXT_PUBLIC_VOICE_URL=http://localhost:4000
DOORDASH_SUPPORT_NUMBER=+1XXXXXXXXXX    # E.164; must match voice allowlist
VOICE_SHARED_SECRET=<same as apps/voice>
```

Generate a shared secret: `openssl rand -hex 32` — use the **same** value in **`apps/voice/.env.local`** and **`apps/web/.env.local`**.

See root **`.env.example`** for the full variable list (`VOICE_SERVICE_URL`, `WEB_ORIGIN` on the voice app, etc.).

### Tests

```bash
pnpm test:all          # all workspace packages
pnpm test:demo         # apps/web rehearsal integration test
pnpm -F @counter/voice test   # voice unit tests (auth, hardening)
```

## Security

The voice service may use a public URL (ngrok) during demos. Hardening:

- **Shared secret** — `VOICE_SHARED_SECRET` in both `apps/voice/.env.local` and `apps/web/.env.local` (`x-counter-token` on server-to-server calls).  
  - **Development:** if unset, voice logs a warning once and allows requests (local demo).  
  - **Production** (`NODE_ENV=production` on the voice app): if unset, protected routes return **503** `misconfigured` — outbound calls are blocked until the secret is set.
- **CORS** — `WEB_ORIGIN` in `apps/voice/.env.local` (comma-separated). Defaults to `http://localhost:3000`.
- **Phone allowlist** — `ALLOWED_CALL_NUMBERS` or fallback `DOORDASH_SUPPORT_NUMBER` (E.164).
- **Rate limiting** — `/calls/outbound`: 10 / 5 min per IP; tools: 60 / min.
- **Webhooks** — `ElevenLabs-Signature` verified with `ELEVENLABS_WEBHOOK_SECRET` before persisting transcripts.

The **dashboard and Next.js API routes are not authenticated** — suitable for a controlled demo only. Do not expose a production deployment to the open internet without adding auth or network controls.

Tests: `apps/voice/test/auth.test.ts`, `apps/voice/test/hardening.test.ts`.

## Team

Built at O1 Summit 2026 by a 4-person team working in parallel using Claude Code. Shared contracts live in `packages/types`. See `docs/CLAUDE_CODE_PRACTICES.md`.

## Not included

- Live scraping of real DoorDash/UberEats/Grubhub accounts — mock portal in `apps/web` for ToS safety and demo reliability
- Multi-tenant authentication
- Mobile-responsive UI
- Real Vanta integration (mocked locally)

## License

Private. Not for redistribution.
