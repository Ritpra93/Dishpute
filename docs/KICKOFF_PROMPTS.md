# Kickoff Prompts

Each worker pastes their prompt as the **first message** into their Claude Code session at the start of the hackathon. These prompts load context, ground Claude in verified facts, and force a plan before any code is written.

---

## Worker 0 — Types package (everyone, hours 0–2)

Pick one person to drive. Other 3 workers watch — this builds the contract you all depend on.

Paste into Claude Code (working directory: **repo root** for this one task):

```
I'm bootstrapping a pnpm monorepo for a 24-hour hackathon project called Counter.

Before writing any code, read these files in order and summarize back to me what you understand:

1. CLAUDE.md
2. START_HERE.md
3. docs/ARCHITECTURE.md
4. docs/VERIFIED_APIS.md
5. docs/INTERFACES.md
6. docs/CLAUDE_CODE_PRACTICES.md

Then propose the setup of packages/types/ according to packages/types/CLAUDE.md.

Specifically propose (before writing):
- packages/types/package.json with "main" and "types" pointing at src/index.ts
- Every type from docs/INTERFACES.md verbatim in src/index.ts
- src/constants.ts with MERIT_THRESHOLDS and DISPUTE_WINDOW_DAYS = 14
- src/fixtures.ts with 30 realistic DisputeCandidate objects for House of Curry (South Indian restaurant, 3 Minneapolis locations) — vary charge types, amounts, customer comments
- schema.sql from docs/INTERFACES.md verbatim
- A tsconfig.json

Show me your plan first. I'll approve, then you write. After, run `pnpm -F @counter/types build` and verify it passes.

Rules:
- Types match docs/INTERFACES.md exactly — they are frozen contracts
- No `any` types anywhere
- Commit with message `feat(types): initial shared contracts and schema` when done
```

---

## Worker 1 — Scraper (TinyFish)

Paste into Claude Code (working directory: `packages/scraper/`):

```
You are Worker 1 on Counter, a 24-hour hackathon project. Your module is the TinyFish-powered browser automation that reads and submits disputes in the merchant's authenticated portal session.

Before writing any code, do this:

1. Read these files and summarize back:
   - ../../CLAUDE.md (root project context)
   - ../../docs/VERIFIED_APIS.md (authoritative API reference — TinyFish section is yours)
   - ../../docs/INTERFACES.md (shared type contracts — do not redefine)
   - ../../docs/CLAUDE_CODE_PRACTICES.md
   - ./CLAUDE.md (your worker context)

2. Confirm your scope: you only modify files inside packages/scraper/. If you think you need to change something outside (especially packages/types/), stop and ask me first.

3. Quote back the verified TinyFish API facts from docs/VERIFIED_APIS.md:
   - The exact endpoint URL for running an agent task with SSE
   - The exact authentication header name and format
   - Request body shape
   - How to parse SSE events to find the terminal COMPLETE event

If your understanding of TinyFish differs from docs/VERIFIED_APIS.md, the docs win. If you catch yourself about to call "tinyfishClient.runTask()" or any typed SDK method — stop. TinyFish has no typed SDK; it's fetch + SSE.

4. Propose Task 1 from ./CLAUDE.md: package.json + __fixtures__/doordash-disputes.json with 30 realistic DisputeCandidate objects + createMockScraper() stub. Show me the plan BEFORE coding.

5. When I approve, write it. Verify `pnpm -F @counter/scraper build` and `pnpm -F @counter/scraper test` pass.

Rules for the whole session:
- Files inside packages/scraper/ only
- Import types from @counter/types — never redefine
- Before calling any library method, verify against docs/VERIFIED_APIS.md or the package's actual .d.ts
- Commit after each completed task with a conventional message
```

---

## Worker 2 — Classifier (Claude)

Paste into Claude Code (working directory: `packages/classifier/`):

```
You are Worker 2 on Counter, a 24-hour hackathon project. You build the Claude-powered dispute classifier and drafter.

Before writing any code:

1. Read and summarize:
   - ../../CLAUDE.md
   - ../../docs/VERIFIED_APIS.md (Anthropic section is yours — pay close attention)
   - ../../docs/INTERFACES.md
   - ../../docs/CLAUDE_CODE_PRACTICES.md
   - ./CLAUDE.md

2. Confirm your scope boundary: packages/classifier/ only.

3. Quote back the verified Anthropic facts from docs/VERIFIED_APIS.md:
   - Current model ID for Sonnet (hint: it's NOT 4.7)
   - Current model ID for Haiku
   - The NEW structured-outputs API syntax (output_config.format with json_schema) — this is what we use, NOT the old forced tool_choice
   - Prompt caching syntax with cache_control

If your training data disagrees with docs/VERIFIED_APIS.md, the docs win. Sonnet 4.7 does not exist; we use Sonnet 4.6 (claude-sonnet-4-6).

4. Propose Task 1: createMockClassifier() that maps Worker 1's 30 fixture candidates to 30 realistic ClassifiedDispute outputs. Show me the plan first.

5. When approved, write it. Wait for Worker 1's fixtures to be finalized before Task 2 (real Claude integration).

Rules:
- Files inside packages/classifier/ only
- Use the NEW output_config.format API for structured output, not forced tool_choice
- Add prompt caching to the system prompt from day one
- Route easy classifications to Haiku 4.5; Sonnet 4.6 only for final draft text
- Commit after each task

The drafted dispute text is what merchants see in the UI. If it reads like a generic template, we lose the prize. Quality > speed on this module.
```

---

## Worker 3 — Web (Ritesh — Next.js 16 dashboard + mock portal)

Paste into Claude Code (working directory: `apps/web/`):

```
You are Worker 3 on Counter. You build the Next.js 16 dashboard and the mock DoorDash portal. This module is what the judges SEE during the demo — polish matters enormously.

Before any code:

1. Read and summarize:
   - ../../CLAUDE.md
   - ../../docs/VERIFIED_APIS.md (frontend stack section is yours)
   - ../../docs/INTERFACES.md
   - ../../docs/DEMO_SCRIPT.md ← critical; your UI carries the demo
   - ../../docs/CLAUDE_CODE_PRACTICES.md
   - ./CLAUDE.md

2. Confirm scope: apps/web/ only.

3. Quote back the verified frontend stack facts from docs/VERIFIED_APIS.md:
   - Which Next.js version are we on (NOT 15)
   - What's the animation library package name called (NOT framer-motion)
   - What's the shadcn CLI package called (NOT shadcn-ui)
   - Which flag in next.config.ts is mandatory for better-sqlite3
   - Node version

4. Propose scaffolding:
   - Next.js 16 App Router with TypeScript, Tailwind, Turbopack
   - shadcn init (using `shadcn`, not `shadcn-ui`)
   - `motion` (not framer-motion) for animations
   - better-sqlite3 with serverExternalPackages config
   - Directory structure for app/, components/, lib/, scripts/
   Show me the plan BEFORE running create-next-app.

5. When approved, scaffold. Then build the dashboard shell using createMockScraper and createMockClassifier from the workspace packages to render fixture data immediately.

6. After the shell works, read docs/DEMO_SCRIPT.md again and identify UI elements for each demo beat. Build those first; skip everything else until they're solid.

Rules:
- apps/web/ only
- Dashboard is 'use client' (need reactivity for live queue)
- No global state libraries — useState + fetch
- Design: Linear or Stripe, NOT Duolingo. Neutral, confident, quiet
- Framer Motion via `motion` for the dollar counter — this is a hero animation
- Coordinate with Worker 1 on mock portal DOM structure before hour 4
- Commit after every working feature

Demo restaurant: House of Curry (3 Minneapolis locations, South Indian). Use this in all mock data and copy.
```

---

## Worker 4 — Voice (ElevenLabs + Twilio + ngrok + Vanta mock)

Paste into Claude Code (working directory: `apps/voice/`):

```
You are Worker 4 on Counter. You build the voice-escalation service — the demo climax. You also set up the mocked Vanta MCP endpoint and own the ngrok tunnel.

Before any code:

1. Read and summarize:
   - ../../CLAUDE.md
   - ../../docs/VERIFIED_APIS.md (ElevenLabs + Vanta + ngrok sections are yours)
   - ../../docs/INTERFACES.md
   - ../../docs/DEMO_SCRIPT.md ← Beat 4 is yours; rehearse it mentally
   - ../../docs/CLAUDE_CODE_PRACTICES.md
   - ./CLAUDE.md

2. Confirm scope: apps/voice/ only, PLUS the repo-root .mcp.json entry for the Vanta mock if we do one.

3. Quote back the verified ElevenLabs facts:
   - Exact endpoint URL for initiating an outbound call via Twilio native integration
   - Required headers
   - Shape of conversation_initiation_client_data.dynamic_variables
   - Post-call webhook signature verification mechanism
   - Why we use ElevenLabs' native Twilio integration, NOT a custom Media Streams WebSocket

4. Propose Task 1: Express scaffolding, stub /calls/outbound returning a fake VoiceCallRecord, 3 fixture call transcripts in __fixtures__. Show me the plan first.

5. When approved, write Task 1. Then, in order:
   - ngrok tunnel with stable subdomain
   - Real ElevenLabs outbound call with dynamic variables
   - Function-calling tool webhooks (/tools/lookup_case, /tools/reference_evidence, /tools/escalate_to_supervisor)
   - Post-call webhook with signature verification
   - Mock Vanta MCP endpoint
   - Pre-recorded backup audio for demo safety

Rules:
- apps/voice/ only (plus .mcp.json if doing Vanta MCP mock)
- Use ElevenLabs Conversational AI + native Twilio, NOT custom Media Streams
- Create the ElevenLabs agent in the DASHBOARD UI (I'll do that manually) — NOT programmatically
- Public tunnel uses ngrok with stable subdomain
- Agent tool responses under 1.5s — slow tools = dead air on stage = demo failure
- Agent IDENTIFIES as "automated agent calling on behalf of House of Curry" — honest disclosure, not pretending to be human
- Commit after every task

The voice call is the moment that wins or loses us the prize. Prioritize it ruthlessly.
```

---

## After the first Claude Code response

When Claude Code responds with a summary + plan, the human reviewer checks four things:

1. **Did Claude actually read the files?** The summary should reference specifics from CLAUDE.md, not generic paraphrases.
2. **Does it understand its scope boundary?** If Claude says "I'll also touch packages/types to add a field," push back.
3. **Did it verify APIs against `docs/VERIFIED_APIS.md`?**
   - Worker 1 should quote `https://agent.tinyfish.ai/v1/automation/run-sse` with `X-API-Key`
   - Worker 2 should quote `claude-sonnet-4-6` and `output_config.format`
   - Worker 3 should quote Next.js 16, `motion`, `shadcn`, `serverExternalPackages`
   - Worker 4 should quote `POST /v1/convai/twilio/outbound-call` and the `ElevenLabs-Signature` header
4. **Is the plan realistic for hour 0–4?** If it proposes 15 features in one task, cut it back.

If any check fails, redo the plan before coding.

---

## The continuous-prompt pattern

Once Claude Code is working, every subsequent task uses this pattern:

```
Task [N] from your CLAUDE.md: [brief description].

Before coding:
- List the files you'll create or modify
- List the dependencies you'll add (if any)
- Identify shared types you need; verify they're in @counter/types already
- Flag any library API you're uncertain about — verify against docs/VERIFIED_APIS.md or live docs before writing

Code only after I approve the plan. After coding, run build/test and show me output. Commit with conventional message when green.
```

Plan → approve → code → verify → commit. Skipping the plan step is how you end up with broken abstractions at hour 18.
