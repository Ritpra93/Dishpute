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
COUNTER_WEB_API_KEY=<32-byte hex>       # required in prod for privileged API routes
```

Generate both secrets with `openssl rand -hex 32`. `VOICE_SHARED_SECRET` must match the value in **`apps/voice/.env.local`**. `COUNTER_WEB_API_KEY` is sent as `x-counter-token` to the privileged web routes (see [Security](#security)).

See root **`.env.example`** for the full variable list (`VOICE_SERVICE_URL`, `WEB_ORIGIN` on the voice app, etc.).

### Tests

```bash
pnpm test:all          # all workspace packages
pnpm test:demo         # apps/web rehearsal integration test
pnpm -F @counter/voice test   # voice unit tests (auth, hardening)
```

## Security

The voice service may use a public URL (ngrok) during demos, and the classifier ingests scraped merchant-portal HTML, so both layers are hardened.

### Voice service (`apps/voice`)

- **Shared secret** — `VOICE_SHARED_SECRET` in both `apps/voice/.env.local` and `apps/web/.env.local` (`x-counter-token` on server-to-server calls).
  - **Development:** if unset, voice logs a warning once and allows requests (local demo).
  - **Production** (`NODE_ENV=production` on the voice app): if unset, protected routes return **503** `misconfigured` — outbound calls are blocked until the secret is set.
- **CORS** — `WEB_ORIGIN` in `apps/voice/.env.local` (comma-separated). Defaults to `http://localhost:3000`.
- **Phone allowlist** — `ALLOWED_CALL_NUMBERS` or fallback `DOORDASH_SUPPORT_NUMBER` (E.164).
- **Rate limiting** — `/calls/outbound`: 10 / 5 min per IP; unauthenticated `/calls/:id/*` read endpoints: 120 / min; tools: 60 / min.
- **Webhooks** — `ElevenLabs-Signature` verified with `ELEVENLABS_WEBHOOK_SECRET` before persisting transcripts. Signature mismatches and missing signatures emit `event=webhook_failure` log markers for alerting.
- **Input validation** — `conversationId` values are regex-validated (`/^[A-Za-z0-9_-]{8,128}$/`) before being used in file paths or upstream calls.
- **`/health`** — omits `ngrokPublicUrl` when `NODE_ENV=production`.

### Web service (`apps/web`)

- **Privileged API key** — `COUNTER_WEB_API_KEY` on `apps/web/.env.local`. Sent as `x-counter-token` to protect `/api/scan`, `/api/disputes/*/submit`, `/api/disputes/*/escalate`, `/api/disputes/submit-all`, `/api/stripe/onboarding`, and `/api/transfers/demo-arm`. Compared with `timingSafeEqual`.
  - **Development:** if unset, the route logs a warning and proceeds (local demo).
  - **Production** (`NODE_ENV=production`): if unset, privileged routes return **503** `misconfigured`.
- **Rate limiting** — per-route IP buckets on the same privileged routes (e.g. scan 10/min, submit 30/min, submit-all 3/min, escalate 5/min, stripe onboarding 5/min). Skipped in `NODE_ENV=test` so the integration suite doesn't trip its own limits.
- **Proxy input validation** — `/api/calls/[conversationId]/audio` and `/api/calls/[conversationId]/live` reject malformed IDs with a 400 before proxying upstream.

### Classifier + scraper (`packages/classifier`, `packages/scraper`)

The scraped-HTML → Claude path is a live prompt-injection surface. Hardening:

- **Explicit delimiters** — `buildUserMessage` wraps `customerComment` and `rawText` (scraped HTML) in `<customer_comment>…</customer_comment>` and `<scraped_content>…</scraped_content>` tags; any occurrence of those tokens inside untrusted input is stripped via `sanitizeUntrusted`.
- **System-prompt directive** — every Claude system prompt (classifier, prefilter, triage, evidence, negotiator) prepends a `UNTRUSTED_INPUT_DIRECTIVE` telling the model to treat tagged content strictly as data, ignore embedded instructions, and treat injection attempts as a fraud signal that lowers `meritScore`.
- **TinyFish goal sanitization** — LLM-drafted dispute text is stripped of control characters, fenced blocks, and delimiter tokens before being embedded in the browser agent's goal. The goal uses `<<<RESPONSE_START>>>` / `<<<RESPONSE_END>>>` delimiters.
- **Scraper ID validation** — `orderId` / `candidateId` values are validated against `/^[A-Za-z0-9_.:-]+$/` before interpolation into TinyFish goals.
- **SSRF allowlist** — `submitDispute` rejects `portalUrl` hosts outside the configured DoorDash / mock-portal allowlist.

### Secrets

See the **SECRET ROTATION CHECKLIST** in `.env.example` for the full list of secrets (Anthropic, TinyFish, ElevenLabs, Twilio, Stripe, ngrok, `VOICE_SHARED_SECRET`, `COUNTER_WEB_API_KEY`) and the commands to rotate each one before a public deploy.

### Tests

- `apps/voice/test/auth.test.ts` — shared-secret middleware
- `apps/voice/test/hardening.test.ts` — rate limits, CORS, phone allowlist, webhook signatures
- `apps/voice/test/smoke.test.ts` — outbound + webhook happy path
- `apps/web/test/rehearsal.test.ts` — full Beat 2→4 demo walk with real voice app in-process
- `apps/web/test/contracts.test.ts` — escalate payload / voice contract

## Team

Built at O1 Summit 2026 by a 4-person team working in parallel using Claude Code. Shared contracts live in `packages/types`. See `docs/CLAUDE_CODE_PRACTICES.md`.

## Not included

- Live scraping of real DoorDash/UberEats/Grubhub accounts — mock portal in `apps/web` for ToS safety and demo reliability
- Multi-tenant authentication
- Mobile-responsive UI
- Real Vanta integration (mocked locally)

## License

Private. Not for redistribution.
