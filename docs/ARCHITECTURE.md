# Architecture

## Data flow

```
1. Merchant opens Counter dashboard
                    │
                    ▼
           ┌──────────────┐
           │  apps/web    │  "Scan DoorDash" clicked
           │  Next.js 16  │
           └──────┬───────┘
                  │ POST /api/scan
                  ▼
┌──────────────────────────────────────────────────────────┐
│              packages/scraper (TinyFish)                 │
│                                                          │
│  2. TinyFish cloud agent opens the mock DoorDash portal  │
│     (served by apps/web at /mock-portal/disputes)        │
│     → authenticates via pre-seeded session               │
│     → scrapes every open error charge                    │
│                                                          │
│  Returns: DisputeCandidate[]                             │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│          packages/classifier (Claude)                    │
│                                                          │
│  3. Haiku 4.5 pre-filter (cheap): is this worth          │
│     disputing at all?                                    │
│                                                          │
│  4. For merit-worthy ones: Sonnet 4.6 with structured    │
│     output returns meritScore, reasoning, drafted text,  │
│     evidence citations.                                  │
│                                                          │
│  Returns: ClassifiedDispute[]                            │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
     SQLite (counter.db)
           │
           │  5. apps/web renders live dashboard
           ▼
     Dashboard (Merchant)
           │  Clicks "Submit all >70 merit"
           │ POST /api/disputes/submit-all
           ▼
┌──────────────────────────────────────────────────────────┐
│       packages/scraper.submitDispute (TinyFish again)    │
│                                                          │
│  6. For each classified dispute:                         │
│     → TinyFish navigates to the dispute detail page      │
│     → Pastes drafted text                                │
│     → Submits                                            │
│     → Captures confirmation ID                           │
│                                                          │
│  Returns: SubmissionResult                               │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
     7. Outcomes seeded (for demo): some approved,
        some denied, some pending
           │
           │ If denied + meritScore ≥ 70:
           │ escalateToVoice = true
           ▼
┌──────────────────────────────────────────────────────────┐
│           apps/voice (ElevenLabs + Twilio)               │
│                                                          │
│  8. POST /calls/outbound                                 │
│  9. ElevenLabs outbound call via Twilio native           │
│     integration                                          │
│ 10. Agent talks to "merchant support" (teammate on       │
│     speaker), uses function-calling tools:               │
│       - lookup_case(caseId)                              │
│       - reference_evidence(caseId)                       │
│       - escalate_to_supervisor(reason)                   │
│ 11. Post-call webhook → transcript + analysis            │
│ 12. Claude parses transcript → VoiceCallRecord.outcome   │
└──────────────────────────────────────────────────────────┘
```

## Why each choice

### TinyFish, not Playwright

The product's moat is "runs in the merchant's authenticated session on a portal with no public API." TinyFish's cloud-hosted agents with residential proxies, stealth mode, and persistent sessions make that moat real at scale. Playwright gets fingerprinted in production; we'd spend the hackathon fighting bot detection. For the hackathon we're scraping our own mock portal, but using TinyFish keeps the narrative true — on day 1 of the real product we'd already be on the right infrastructure.

### Claude structured outputs, not prompt-engineered JSON

Anthropic's new `output_config.format` API (GA early 2026) gives us validated, schema-compliant JSON directly. No "please return only JSON" instructions, no parse-retry loops. For a 30-dispute batch classification, this is the difference between 95% reliability and 100%.

### ElevenLabs native Twilio, not custom Media Streams

Every past winning demo at ElevenLabs hackathons used the native Twilio integration from the dashboard. Custom Media Streams WebSocket is 10× the work and 2× the bugs. ElevenLabs handles STT + LLM + TTS + turn-taking internally; we just configure the agent and tools.

### SQLite, not Postgres

Zero ops, single file, survives demo laptop sleep, no Docker network. Swap to Postgres on day 2 of the real product.

### Separate Express app for voice, not Next.js route

Twilio + ElevenLabs webhooks need a public URL via ngrok. Keeping voice in its own process means webhook issues or outbound-call hangs don't crash the dashboard mid-demo. Hard-earned hackathon rule: isolate the demo-critical UI from services that touch the outside world.

### Mocked DoorDash portal, not real DoorDash

Four reasons: (1) test accounts get nuked if we scrape aggressively, (2) TinyFish is the vehicle, not the target — the demo story is "navigates any authenticated portal," (3) DoorDash's UI changes weekly; demos die when selectors break, (4) DoorDash ToS prohibits third-party submission; we stay scrupulous. Worker 3 builds the mock portal as a page inside the Next.js app.

### Mocked Vanta, not real Vanta

Vanta has no self-serve trial — you cannot set up a real tenant on Saturday morning. We build a local fixture server that matches the real Vanta MCP tool surface, so the trust-center UI reads authentically. The pitch narrative is unchanged; only the backend is mocked. We do not claim actual SOC 2 compliance.

## Repo structure

```
counter/
├── CLAUDE.md                       # Master context — read first
├── START_HERE.md                   # First 30 minutes of the hackathon
├── PRE_HACKATHON.md                # Account setup + Friday-night dry run
├── README.md                       # What this is, how to run
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── .mcp.json                       # Optional TinyFish MCP for dev loop
│
├── docs/
│   ├── ARCHITECTURE.md             # This file
│   ├── VERIFIED_APIS.md            # Source of truth for all external APIs
│   ├── CLAUDE_CODE_PRACTICES.md    # How to work in parallel without collisions
│   ├── INTERFACES.md               # Shared TS types + REST contracts + SQL schema
│   ├── TIMELINE.md                 # 24-hour schedule with checkpoints
│   ├── DEMO_SCRIPT.md              # 10-minute pitch, beat-by-beat
│   ├── SPONSOR_PRIZES.md           # How each integration earns a prize
│   ├── RISKS.md                    # Pre-mortem + mitigations
│   ├── KICKOFF_PROMPTS.md          # The exact first message each worker pastes
│   └── OPEN_QUESTIONS.md           # Unresolved decisions, updated live
│
├── packages/
│   ├── types/                      # Shared — frozen after hour 2
│   │   ├── CLAUDE.md
│   │   ├── package.json
│   │   ├── schema.sql
│   │   └── src/
│   │       ├── index.ts            # Type exports
│   │       ├── constants.ts
│   │       └── fixtures.ts         # Sample data
│   │
│   ├── scraper/                    # Worker 1
│   │   ├── CLAUDE.md
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts            # Public API
│   │   │   ├── tinyfish.ts         # REST + SSE client
│   │   │   ├── doordash.ts         # DoorDash-specific flows
│   │   │   └── parsers.ts          # Extracted data → DisputeCandidate
│   │   ├── __fixtures__/
│   │   │   └── doordash-disputes.json
│   │   └── test/
│   │       └── smoke.test.ts
│   │
│   └── classifier/                 # Worker 2
│       ├── CLAUDE.md
│       ├── package.json
│       ├── src/
│       │   ├── index.ts            # classify() + classifyMany() + mock factory
│       │   ├── claude.ts           # Anthropic client wrapper with caching
│       │   ├── schemas.ts          # JSON schemas for structured outputs
│       │   ├── prompts.ts          # System prompt + per-error-type templates
│       │   └── evidence.ts         # Mocked POS cross-reference
│       ├── __fixtures__/
│       │   └── classifications.json
│       └── test/
│           └── smoke.test.ts
│
└── apps/
    ├── web/                        # Worker 3 (Ritesh)
    │   ├── CLAUDE.md
    │   ├── package.json
    │   ├── next.config.ts
    │   ├── tailwind.config.ts
    │   ├── app/
    │   │   ├── page.tsx            # Landing
    │   │   ├── dashboard/page.tsx  # Hero dashboard
    │   │   ├── mock-portal/        # Fake DoorDash portal
    │   │   │   ├── layout.tsx
    │   │   │   └── disputes/page.tsx
    │   │   ├── trust/page.tsx      # Vanta trust center (mocked)
    │   │   ├── onboarding/page.tsx # Stripe Connect onboarding
    │   │   └── api/
    │   │       ├── scan/route.ts
    │   │       ├── disputes/route.ts
    │   │       ├── disputes/[id]/submit/route.ts
    │   │       ├── disputes/[id]/escalate/route.ts
    │   │       ├── disputes/submit-all/route.ts
    │   │       ├── stats/route.ts
    │   │       ├── trust/route.ts
    │   │       └── stripe/onboarding/route.ts
    │   ├── components/
    │   │   ├── dispute-queue.tsx
    │   │   ├── dollar-counter.tsx
    │   │   ├── scan-progress.tsx
    │   │   ├── dispute-detail.tsx
    │   │   ├── escalate-button.tsx
    │   │   ├── activity-log.tsx
    │   │   └── ui/                 # shadcn components
    │   ├── lib/
    │   │   ├── db.ts               # better-sqlite3 client
    │   │   └── api.ts
    │   ├── scripts/
    │   │   └── seed-demo.ts        # Resets DB to the 30 demo disputes
    │   └── public/
    │
    └── voice/                      # Worker 4
        ├── CLAUDE.md
        ├── package.json
        ├── src/
        │   ├── server.ts           # Express entrypoint
        │   ├── elevenlabs.ts       # SDK wrapper
        │   ├── twilio.ts
        │   ├── agent-config.ts     # Documented agent settings (not programmatic)
        │   ├── vanta-mock.ts       # Mocked Vanta MCP data
        │   └── routes/
        │       ├── calls.ts        # POST /calls/outbound
        │       ├── tools.ts        # Function-calling webhook endpoints
        │       ├── webhooks.ts     # Post-call webhook with signature verification
        │       └── vanta.ts        # GET /api/vanta/trust-center
        ├── __fixtures__/
        │   └── call-transcripts.json
        ├── public/
        │   └── backup-call.mp3     # Pre-recorded demo backup
        └── test/
            └── smoke.test.ts
```
