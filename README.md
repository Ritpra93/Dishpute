# Counter

**Agentic dispute assistant for restaurants on food delivery platforms.**

Restaurants lose $10K–$50K per year to DoorDash/UberEats/Grubhub missing-item auto-charges they never dispute. Merchant portals are hostile by design — multi-step forms, no bulk actions, 14-day window. Counter is a co-pilot that reads the dispute queue from inside the merchant's authenticated session, classifies and drafts every disputable charge with Claude, submits them, and escalates denials to support via an ElevenLabs voice agent.

Built at O1 Summit 2026. 24-hour hackathon, 4-person team

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
- better-sqlite3
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
├── docs/                       # All planning + reference docs
├── packages/
│   ├── types/                  # Shared TS contracts + SQL schema
│   ├── scraper/                # TinyFish wrapper (Worker 1)
│   └── classifier/             # Claude classifier (Worker 2)
└── apps/
    ├── web/                    # Next.js dashboard + mock portal (Worker 3)
    └── voice/                  # ElevenLabs voice escalation (Worker 4)
```

## Running locally

Prerequisites: Node 24 LTS, pnpm 9.15+.

```bash
# 1. Install dependencies
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

Open http://localhost:3000/dashboard.

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

Built at O1 Summit 2026 by a 4-person team working in parallel using Claude Code. Each worker owned one module; shared contracts lived in `packages/types`. See `docs/CLAUDE_CODE_PRACTICES.md` for the workflow.

## Not included

- Real DoorDash/UberEats/Grubhub scraping against live accounts — we target a mock portal for ToS safety and demo reliability
- Multi-tenant authentication
- Mobile-responsive UI
- Real Vanta integration (mocked locally — no self-serve trial available)

## License

Private. Not for redistribution.
