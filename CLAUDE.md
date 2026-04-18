# Counter — Master Project Context

> **For Claude Code:** Read this first. Then read the CLAUDE.md inside your specific worker directory. Then read `docs/VERIFIED_APIS.md` before writing any code that calls a third-party API.

## The product

**Counter** is an agentic dispute assistant for restaurants on food delivery platforms. Restaurants are auto-charged 25–100% of item price + tax + commission for every "missing item" report a customer files. Most restaurants lose $10K–$50K/year and never dispute, because merchant portals are hostile by design — multi-step forms, no bulk actions, 14-day window.

Counter runs inside the restaurant's authenticated browser session (via TinyFish), reads the error-charge queue, uses Claude to classify and draft a dispute for every merit-worthy charge, submits them all, and escalates denials to merchant support via an ElevenLabs voice agent.

**Demo customer:** House of Curry (a real independent restaurant — my friend's business).
**ICP:** Operators of 1–20 location restaurant groups doing ≥$20K/mo on delivery.
**Monetization:** 20% contingency on recovered funds.
**Moat:** DoorDash ToS prohibits third-party dispute submission. We don't submit *for* the merchant — we pilot *their* authenticated session. Only possible with cloud browser agents (TinyFish).

## Hackathon context

- **Event:** O1 Summit, 24 hours, 4-person team, everyone using Claude Code.
- **Demo format:** 10-minute live demo.
- **Primary prizes:** SeedLegals + StarterYou (startup potential), TinyFish (core moat), ElevenLabs (voice escalation), Stripe (contingency payouts).
- **Skipping:** Vanta (no self-serve trial — mocking the MCP), AWS Kiro (spec overhead not worth it for a beginner team).
- **Team:** 4 people. **All beginners in the specific tech stacks we're using.** Claude Code is the primary builder; humans plan, review, and integrate.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    apps/web (Next.js 16)                    │
│  Merchant dashboard · live queue · dollar counter · auth    │
│                   + mock DoorDash portal                    │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
           │ REST (/api)                          │ REST
           ▼                                      ▼
┌────────────────────┐              ┌────────────────────────┐
│ packages/scraper   │              │   apps/voice (Express) │
│ TinyFish REST API  │              │ ElevenLabs + Twilio    │
│ · list disputes    │              │ · outbound calls       │
│ · submit dispute   │              │ · function tools       │
│ · outcomes         │              │ · post-call webhook    │
└─────────┬──────────┘              └────────────────────────┘
          │
          │ DisputeCandidate[]
          ▼
┌────────────────────┐
│ packages/classifier│
│ Claude Sonnet 4.6  │
│ Haiku 4.5 for cheap│
│ · merit score      │
│ · drafted text     │
│ · structured out   │
└────────────────────┘

  packages/types  ← shared TypeScript contracts (owned by all, frozen hour 2)
```

## Tech stack — verified April 2026

Every version, package name, and API path below has been verified. See `docs/VERIFIED_APIS.md` for sources. **Do not substitute packages without consensus.**

- **Node:** 24 LTS
- **Language:** TypeScript strict, everywhere
- **Monorepo:** pnpm workspaces
- **Frontend:** Next.js **16.2.x** App Router + Tailwind + shadcn/ui (package is `shadcn`, NOT `shadcn-ui`)
- **Animation:** `motion` (the Framer Motion rename), NOT `framer-motion`
- **Backend:** Next.js API routes (in `apps/web`) for merchant APIs; separate Express app in `apps/voice` for Twilio webhooks (needs public URL)
- **Database:** SQLite via `better-sqlite3` 12.9+ — file-based, zero ops. **Add `serverExternalPackages: ['better-sqlite3']` to `next.config.ts`.**
- **Browser automation:** TinyFish REST API (`https://agent.tinyfish.ai/v1/automation/run-sse` with `X-API-Key` header). No typed SDK — plain `fetch` + SSE parsing. Optional `@tiny-fish/cli` MCP server for Claude Code dev loop.
- **Voice:** ElevenLabs Conversational AI agents + native Twilio integration. **NOT custom Media Streams WebSocket.** Endpoint: `POST /v1/convai/twilio/outbound-call`.
- **LLM:** Claude Sonnet 4.6 (`claude-sonnet-4-6`) for classification, Haiku 4.5 (`claude-haiku-4-5`) for cheap pre-filtering. Use the NEW `output_config.format` structured-outputs API, not forced tool use. Add prompt caching from day one.
- **Payments:** Stripe Connect test mode — instant access, magic test tokens handle fake onboarding.
- **Compliance (narrative only):** Mocked Vanta MCP — local fixture server that mimics the real Vanta MCP tool surface, so the trust-center story reads authentically without a real Vanta tenant.
- **Public tunnel:** ngrok free tier (1GB/month is plenty); Cloudflare TryCloudflare as documented fallback.

## Directory ownership

**You do not edit files outside your directory without team chat coordination.** This is the single most important rule for parallel Claude Code work.

| Path | Owner | Purpose |
|---|---|---|
| `packages/types/` | All (set up hour 0–2, then frozen) | Shared TS types + DB schema |
| `packages/scraper/` | Worker 1 | TinyFish REST wrapper + mock-portal scraping |
| `packages/classifier/` | Worker 2 | Claude classification + draft generation |
| `apps/web/` | Worker 3 | Next.js dashboard + mock DoorDash portal + API routes |
| `apps/voice/` | Worker 4 | ElevenLabs + Twilio + ngrok + mocked Vanta |

## Conventions

1. **No secrets in code.** All config via `.env.local`. Root `.env.example` is the source of truth for variable names.
2. **All inter-module data flows through `packages/types`.** New field needed? Add to types first, merge, then use.
3. **Mock aggressively.** Every module ships a `__fixtures__/` folder so downstream workers can start building against stable inputs before upstream is ready.
4. **Verify APIs before using them.** Before writing code against any library or third-party API, either read the verified reference in `docs/VERIFIED_APIS.md` or fetch the current docs. Never call a method from memory.
5. **Plan before coding.** Every Claude Code session starts with "here's what I'm going to build, in what order, here are the files I'll touch." Human approves, then Claude codes.
6. **Commit every 30–60 min** with conventional messages (`feat(scraper): list disputes`). Push to a short-lived branch, merge frequently.
7. **No magic numbers.** Use `packages/types/src/constants.ts`.

## What we are NOT building

- Real DoorDash/UberEats/Grubhub scraping against live accounts. Worker 3 builds a **mock DoorDash portal** at `/mock-portal/disputes` — looks like real DoorDash, Worker 1 scrapes it with TinyFish. No ToS risk, no account bans, demo works on conference wifi.
- Real Stripe Connect payout flow — test mode with magic tokens, mocked fee line in dashboard.
- Multi-tenant auth — single demo merchant hardcoded.
- Mobile responsiveness.
- UberEats or Grubhub (DoorDash-only demo).
- A real Vanta integration — mocked MCP server with realistic fixtures.

## The demo (memorize)

10 minutes. Beat structure is in `docs/DEMO_SCRIPT.md`. One-line summary: **"30 charges found, 22 disputable, $892 recovered — and when one got denied, our agent called DoorDash support live on stage and resolved it."**

## When things break

`docs/RISKS.md` has the pre-mortem. The three most important mitigations:

- **Seed the DB with the 30 demo disputes** before every rehearsal — if TinyFish fails on stage, the dashboard populates from the seed and the demo continues.
- **Pre-record a backup audio of the voice call** — if the live call dies, play the recording and narrate over it.
- **Record a backup video of the full demo** — upload to Devpost before the deadline so even if everything crashes, we have a submission.

## Local dev gotchas

Hit these during the worker-1 + worker-2 + worker-3 merge verification — record so we don't waste time on them again:

- **`pnpm install` after deleting `pnpm-lock.yaml`** triggers an interactive `Proceed? (Y/n)` prompt because the existing `node_modules` is stale relative to the (missing) lockfile. In a non-TTY shell the prompt silently hangs forever (no output, install never starts). **Fix:** pre-clean the workspace `node_modules` before reinstalling, or pipe `yes |`:

  ```bash
  rm -rf node_modules apps/*/node_modules packages/*/node_modules
  pnpm install
  ```

- **`tsx` fails with `EPERM: operation not permitted ... .pipe`** when run inside the Cursor agent sandbox (used by `packages/classifier`'s `pnpm test` and `apps/web`'s `pnpm seed`). `tsx` opens a UNIX socket in `$TMPDIR` for its IPC server, which the sandbox blocks. **Fix:** run those commands with full permissions (outside the sandbox). For agent runs, request `required_permissions: ["all"]`.

- **`pnpm-lock.yaml` corrupted to 1 byte** has shown up after merges. Delete it and reinstall (then commit the regenerated lockfile).

- **Fixture IDs are `dc-NNN` (hyphen)** in `packages/types/src/fixtures.ts` and the classifier mock — *not* `dc_NNN` (underscore). The classifier's hand-tuned `MOCK_DATA` is keyed by hyphen IDs; any change to the fixture ID format must be mirrored in `packages/scraper/src/mock.ts` (`DEMO_OUTCOMES`), `packages/scraper/test/smoke.test.ts`, and `packages/scraper/__fixtures__/doordash-disputes.json`.

- **`apps/web` fixtures are intentionally separate.** `apps/web/lib/fixtures.ts` uses its own `disp_NNNN` IDs by design (Option A isolation) — do not "fix" it to match `dc-NNN`.

## Read next

- If you are Worker 1: `packages/scraper/CLAUDE.md`
- If you are Worker 2: `packages/classifier/CLAUDE.md`
- If you are Worker 3: `apps/web/CLAUDE.md`
- If you are Worker 4: `apps/voice/CLAUDE.md`
- Everyone, before coding: `docs/VERIFIED_APIS.md`
- Everyone, for Claude Code workflow: `docs/CLAUDE_CODE_PRACTICES.md`
- Schedule: `docs/TIMELINE.md`
- Demo: `docs/DEMO_SCRIPT.md`
- Before Saturday: `docs/PRE_HACKATHON.md`
- Per-worker first message: `docs/KICKOFF_PROMPTS.md`
