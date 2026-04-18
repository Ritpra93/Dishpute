# 24-Hour Timeline

Checkpoints are non-negotiable. Missing a checkpoint means you descope; you do not slip. The descope ladder at the bottom is in priority order — cut from top to bottom when behind.

## Phase 1 — Foundation (hours 0–4)

### Hour 0 (everyone together, 30 min)
Follow `START_HERE.md` exactly. Read root `CLAUDE.md` together. Assign workers. Everyone opens Claude Code at their subdirectory and pastes their kickoff prompt.

### Hour 0–2 (everyone on `packages/types`)
One person drives, everyone watches. This is the contract everyone else builds against.

- Implement every type from `docs/INTERFACES.md` in `packages/types/src/index.ts`
- Write `packages/types/schema.sql`
- Write `packages/types/src/constants.ts` (`MERIT_THRESHOLDS`, `DISPUTE_WINDOW_DAYS = 14`, etc.)
- Ship 30 realistic fixture candidates in `packages/types/src/fixtures.ts` — Workers 2 and 3 build against these immediately

**Gate (hour 2):** `pnpm -r typecheck` passes. `packages/types` is frozen. Everyone pulls from main.

### Hour 2–4 (split — build module shells with mocks)

- **Worker 1 (scraper):** Scaffold `packages/scraper`. Implement `createMockScraper()` returning fixture candidates with simulated latency. Ship its own `__fixtures__/doordash-disputes.json` (30 records). Begin the real `tinyfish.ts` client wrapper against `docs/VERIFIED_APIS.md`.
- **Worker 2 (classifier):** Scaffold `packages/classifier`. Implement `createMockClassifier()` returning deterministic classifications for the 30 fixture candidates. Ship `__fixtures__/classifications.json`.
- **Worker 3 (Ritesh, web):** Scaffold Next.js 16 app. Install shadcn, add base components. Build dashboard shell wired to mock scraper + mock classifier. Start the mock DoorDash portal at `/mock-portal/disputes` rendering the 30 fixture disputes.
- **Worker 4 (voice):** Scaffold Express app. Start ngrok with a stable subdomain. Stub `/calls/outbound` to return a fake `VoiceCallRecord` with hardcoded transcript. Ship `__fixtures__/call-transcripts.json`. Begin real ElevenLabs integration.

### Checkpoint @ hour 4 (15 min standup)
Each worker demos their module running with fixtures. If anyone is blocked, descope. The goal: every downstream worker can build against stable upstream outputs by now.

## Phase 2 — Happy Path (hours 4–12)

### Hour 4–8

- **Worker 1:** Real TinyFish scraping of Worker 3's mock portal. `listOpenDisputes()` returns real `DisputeCandidate[]` from scraping live DOM. Begin `submitDispute()`.
- **Worker 2:** Real Claude classifier using structured outputs (`output_config.format`) + prompt caching on system prompt. Haiku 4.5 pre-filter routing. Hand-verify 3 outputs for quality — if any feel robotic, iterate the prompt.
- **Worker 3:** Wire dashboard to real API routes. `/api/scan` calls the real scraper. Dispute queue populates live as classifications complete. Dollar counter tied to classification events.
- **Worker 4:** One real outbound call works end-to-end. Agent picks up, says opening line, calls `lookup_case` tool, delivers case details, hangs up. Transcript captured via post-call webhook.

### Hour 8–12

- **Worker 1:** `submitDispute()` works against mock portal. Confirmation parsing. Outcomes scraping.
- **Worker 2:** Batch `classifyMany()` with 10-way concurrency. Tune prompts against real scraped output.
- **Worker 3:** "Submit all >70 merit" button fully wired. Real-time dollar counter animation via Motion. Dispute detail drawer shows classifier reasoning + drafted text.
- **Worker 4:** Escalation trigger from dashboard. Post-call webhook parses transcript via Claude into `VoiceCallRecord.callOutcome`. Mock Vanta trust center endpoint.

### Checkpoint @ hour 12 (30 min, ALL HANDS)

**The happy-path demo runs end-to-end:**
1. Open dashboard → click scan → disputes populate
2. Classifications complete → queue shows merit scores and drafts
3. Click "Submit all" → 22 disputes submitted
4. Seed script marks one dispute DENIED
5. Click "Escalate to voice" → phone rings → agent talks → call ends → transcript saved

This is the minimum viable demo. If it doesn't run at hour 12, STOP adding features. Fix the happy path before touching anything else.

## Phase 3 — Polish & Demo Prep (hours 12–20)

### Hour 12–16

- **Worker 1:** Error handling with retry + fallback to cached fixtures when TinyFish errors. Flag `SCRAPER_MODE=cache` short-circuits to fixtures with realistic latency — the demo kill-switch.
- **Worker 2:** Evidence citations from mocked POS data. Edge-case handling (ambiguous charges, low-merit filtering). Prompt quality pass — Ritesh reads 5 random outputs aloud, flag anything robotic.
- **Worker 3:** **This is where the demo is won.** Framer Motion (via `motion`) dollar counter tick animation. Smooth scroll to new disputes. DENIED state visualization. Loading states that look like activity, not loading. Tailwind transitions aren't enough; use Motion's spring physics.
- **Worker 4:** Voice agent prompt quality. Agent must identify as "automated agent calling on behalf of House of Curry" — not pretend to be human. Add second function-calling tool. Handle common support-rep responses gracefully.

### Hour 16–20

- **Worker 3:** Stripe Connect test-mode onboarding. Mocked Vanta trust page at `/trust`. Pairs with Worker 4 to get the Vanta mock endpoint returning realistic data.
- **Worker 4:** **Pre-record backup audio** of a perfect call. Multiple takes. Save as `apps/voice/public/backup-call.mp3`. Drop into a simple HTML page at `/backup-call.html` with a play button. Rehearse the call with whoever is playing "support rep."

### Checkpoint @ hour 20 (30 min rehearsal)

- Full demo rehearsal. Ritesh presents. Everyone else silent.
- Time it. **Target 8–9 min (leaves 1–2 min for Q&A).** If >10 min, cut.
- Identify the 3 things most likely to fail on stage. Remediate each.
- Record a backup video (OBS, 1080p) of the full demo. Upload to Devpost immediately — even if everything else dies, we have a submission.

## Phase 4 — Demo Lock (hours 20–24)

### Hour 20–22

- Rehearse the demo 3 times end-to-end with timing.
- Seed demo DB with exact 30 disputes we rehearse with. Deterministic dollar amounts.
- One person does a fresh `git clone` + `pnpm install` + `pnpm dev` to verify the repo works from scratch. If anything breaks, fix now.
- Two people sleep 2–5am. Two people continue polish. Swap at 5am.

### Hour 22–23

- Devpost submission: title, tagline, description, team members, video URL, GitHub link, sponsor prize targets checked.
- README polish. Screenshot of dashboard. Animated GIF of scan.
- Last rehearsal.

### Hour 23–24

- Arrive at venue 30 min early.
- Charge phones.
- Test Twilio number from a different device.
- Demo laptop: close all tabs except what's needed. Notifications off. Zoom 110%.

## The descope ladder

Cut from top to bottom when behind schedule:

1. **Kiro specs** — skipped from the start
2. **Mobile responsiveness** — demo on laptop anyway
3. **Stripe Connect onboarding UI** — show a mock fee line instead
4. **Post-call Claude transcript parsing** — show raw transcript
5. **Evidence citation UI polish** — basic list is fine
6. **Activity log component** — nice-to-have
7. **Dispute detail animations** — basic fade-in works
8. **Per-error-type prompt templates** — one system prompt for all types
9. **Real Vanta mock endpoint** — hardcode data in the React component
10. **Outcome scraping** — seed DB manually with outcomes for the demo

Never cut:

- TinyFish scraping the mock portal (proves the moat)
- Claude classification with reasonable drafted text
- Dashboard with dollar counter
- One working voice call (the demo climax)
- Seed-to-demo flow that works offline

## Sleep schedule (recommended)

- 2am–5am: Workers 1 and 4 sleep
- 5am–8am: Workers 2 and 3 sleep
- Everyone awake by 8am for the final polish + rehearsal push

Do not push through without sleep. A tired demo is a bad demo.
