# Dishpute — Claude Code playbook for all high-wow features

> This document extends the existing `CLAUDE.md` files per worker. Every task below is designed to be pasted **verbatim** into a fresh Claude Code session against the current Dishpute monorepo. The format deliberately mirrors what's already in `packages/scraper/CLAUDE.md` etc. so Claude Code sessions behave consistently.

---

## 0. How to use this document

### Per-task session pattern (follow every time)

Every Claude Code session on this repo should open with this kickoff message, substituting the task ID:

```
Read in this order, then stop and summarize back to me:
  1. /CLAUDE.md (root — repo-wide conventions)
  2. <path-to-your-worker-CLAUDE.md>
  3. /docs/VERIFIED_APIS.md (NEVER call third-party APIs from memory)
  4. /docs/INTERFACES.md (shared types surface)
  5. /docs/DEMO_POLISH_PLAYBOOK.md § <Task ID>

Then plan: tell me the files you will touch, the files you will not,
the APIs you need to verify, and the first commit you will make.
DO NOT write code until I approve the plan.
```

After Claude Code summarizes and proposes a plan, review → approve → let it code → commit (conventional message, e.g. `feat(scraper): batch parallel disputes`) → push → next task.

### Best-practices recap (enforced in every task)

1. **Plan before coding.** If Claude Code jumps into edits, stop it.
2. **Verify APIs against `docs/VERIFIED_APIS.md`** — every task below lists what to verify. If a fact isn't in that file, Claude Code must `web_fetch` the provider's current docs and add the verified fact to `VERIFIED_APIS.md` as part of the same commit.
3. **Shared types only through `packages/types`.** New field → add to types → merge → use.
4. **Mock aggressively.** Every module ships a `__fixtures__/` folder. Downstream consumers must be able to build against fixtures without the upstream module running.
5. **Commit every 30–60 min** with conventional commits (`feat(scope): message`).
6. **No magic numbers.** Put constants in `packages/types/src/constants.ts`.
7. **No secrets in code.** All config via `.env.local`. Add every new env var to root `.env.example`.
8. **Coordinate before touching a shared DOM/schema boundary.** Tasks below call these out explicitly.

### What not to do

- **Do not try to demo all 28 features in one 10-minute pitch.** The research Top 10 (below) is the demo-narrative path; the other 18 are portfolio depth, post-pitch Q&A ammo, and fallback if the narrative tightens. Build all 28, rehearse only the Top 10.
- **Do not substitute packages without team consensus.** `motion` not `framer-motion`, `shadcn` not `shadcn-ui`, `better-sqlite3` (with `serverExternalPackages`), etc.
- **Do not regress the existing `SCRAPER_MODE=cache` kill-switch.** Every new scraper task must respect it.

---

## 1. Feature → worker assignment map

Features from the research doc. Each row lists the primary owner first, then any workers contributing a slice.

| # | Feature | Primary | Also |
|---|---|---|---|
| 1 | Parallel 3-up browser grid | Scraper (S1) | Web (W1, W2) |
| 2 | Live browser feed with reasoning overlay | Scraper (S2) | Web (W2), Classifier (C8) |
| 3 | Self-healing retry with strategy switch | Scraper (S3) | Classifier (C1) |
| 4 | Evidence-bundle builder with capture | Scraper (S4) | Classifier (C2), Web (W3) |
| 5 | "86 the salmon" voice-to-multi-platform | Voice (V1) | Scraper (S5), Web (W4) |
| 6 | Holiday / emergency hours push | Scraper (S6) | Web (W4) |
| 7 | Menu-sync with photo auto-upload | Scraper (S7) | Classifier (C3), Web (W4) |
| 8 | Review-response agent across 5 platforms | Scraper (S8) | Classifier (C4), Web (W4) |
| 9 | Zero-integration onboarding in 90 sec | Scraper (S9) | Web (W5) |
| 10 | "API-proof" positioning | Web (W6) | — |
| 11 | Pre-dispute prevention signal | Scraper (S10) | Web (W7) |
| 12 | Real-time "Recovered today" counter | Web (W8) | — |
| 13 | Judges' phones buzz (SMS fan-out) | Voice (V2) | Web (W8 webhook) |
| 14 | Live phone number judges can dial | Voice (V3) | — |
| 15 | GibberLink agent-to-agent call | Voice (V4) | — |
| 16 | Before/after P&L for merchant | Web (W9) | Classifier (C5) |
| 17 | Confirmation call before >$50 disputes | Voice (V5) | Classifier (C9) |
| 18 | Missing-item save-the-relationship call | Voice (V6) | Classifier (C6) |
| 19 | AI daily briefing at 7am | Voice (V7) | Classifier (C7) |
| 20 | Multi-agent orchestration | Classifier (C1) | — |
| 21 | Adaptive-thinking reasoning panel | Classifier (C8) | Web (W10) |
| 22 | Replay / timeline scrubber | Web (W11) | Scraper (S12), Classifier (C8) |
| 23 | Human-in-the-loop via ElevenLabs | Voice (V8) | Classifier (C9) |
| 24 | Prompt caching cost counter | Classifier (C10) | Web (W12) |
| 25 | Custom Dishpute MCP server | Classifier (C11) | — |
| 26 | Agent Skills per platform | Classifier (C12) | — |
| 27 | Computer-use fallback | Scraper (S11) | — |
| 28 | Before/after P&L (merged into 16) | — | — |

Resulting load: **Scraper 12 tasks · Classifier 12 · Web 12 · Voice 8.** Voice is lighter by design — voice tasks are high-leverage per line-of-code.

---

## 2. Cross-cutting prerequisite: update `docs/VERIFIED_APIS.md` first

Before any worker starts, **one** person (or one Claude Code session on an `apis` branch) appends the following verification stubs to `docs/VERIFIED_APIS.md`. Each stub is a *prompt* — Claude Code must `web_fetch` and fill in the facts, citing URL + date.

```
### TinyFish — BATCH endpoint
- Endpoint URL and HTTP method
- Request body schema (how to pass N run configs, max parallelism, naming)
- Response shape (per-run status, per-run result)
- Rate limits / concurrency caps per plan (Starter, Pro)
- Error behavior (partial success? fail-fast?)

### TinyFish — capture_config
- Exact key name(s) for screenshots, snapshots, video recording
- How captured artifacts are returned (inline base64? signed URLs? event stream?)
- TTL of captured artifacts

### TinyFish — Vault
- Endpoint(s) to store / reference credentials
- Credential reference syntax inside a `goal` string
- Supported credential types (basic auth, OAuth, TOTP, etc.)

### TinyFish — SSE events
- Exhaustive event type list (STARTED, STREAMING_URL, PROGRESS, HEARTBEAT, COMPLETE, ERROR, …)
- Fields on each event type
- STREAMING_URL lifetime and access pattern (embeddable? requires auth?)

### TinyFish — step replay / trace
- How to retrieve step-by-step replay after a run completes
- Retention window per plan tier
- Format of replay (video? structured events? screenshots per step?)

### ElevenLabs Conversational AI — inbound
- Exact endpoint to configure an inbound phone number
- Agent config: system prompt, tools, knowledge base, language auto-detect
- Twilio integration path for inbound (same as outbound? different?)

### ElevenLabs — batch calling
- Endpoint + request schema for batch outbound calls
- Dynamic variable injection per call
- Concurrency limits

### ElevenLabs — MCP tool calls from inside a call
- How to attach tools to an agent
- Tool response roundtrip latency
- Supported tool types (webhook? MCP server? function schema?)

### Twilio — SMS fan-out
- Recommended API (Messaging Service vs direct From=)
- Throughput limits on trial vs paid
- STOP / opt-out handling

### Stripe — Connect transfer webhooks (test mode)
- Webhook event types that fire on a test-mode transfer (transfer.created, charge.succeeded, etc.)
- Payload shape for the "Recovered today" counter
- How to trigger test events from the Stripe CLI

### Claude Sonnet 4.6 — adaptive thinking
- Exact parameter name (thinking, extended_thinking, etc.) and values (auto, high, off…)
- How thinking blocks appear in the response
- Whether thinking blocks are billed as output tokens
- Interaction with prompt caching

### Claude Sonnet 4.6 — prompt caching
- Exact cache_control syntax (type, ttl, default TTL)
- Usage response fields that report cache hits/misses (cache_creation_input_tokens, cache_read_input_tokens, …)
- Read vs write pricing multipliers

### Claude Skills
- Beta header name (skills-2025-10-02 or current)
- How Skills are loaded (folder layout, SKILL.md schema, progressive disclosure)
- Which endpoint / API surface to invoke

### Anthropic MCP server spec
- Current MCP protocol version
- Transport options (stdio, SSE, HTTP)
- Tool schema format

### Claude computer use (Sonnet 4.6)
- Tool type string (computer_20250124 or current)
- Screen resolution and display constraints
- How it interoperates with browser-based flows (can it run against a TinyFish STREAMING_URL page? or must it own the display?)
```

Every task below says "Verify X in `docs/VERIFIED_APIS.md`" — if X isn't there yet, the task blocks until someone completes the stub.

---

## 3. Worker 1 — `packages/scraper` (TinyFish automation)

### 3.1 Kickoff prompt for the first session

```
You are Worker 1 on the Dishpute demo-polish sprint. You own packages/scraper/ only.

Read in this order:
  1. /CLAUDE.md
  2. /packages/scraper/CLAUDE.md
  3. /docs/VERIFIED_APIS.md (TinyFish section — every sub-stub listed)
  4. /docs/INTERFACES.md
  5. /docs/DEMO_POLISH_PLAYBOOK.md § Worker 1 (S1–S12)

Then tell me:
  - Which of S1–S12 is currently unblocked (some depend on VERIFIED_APIS stubs being filled)
  - The exact dependency order you'll attack them in
  - Which TinyFish facts you need to verify before S1

Do not write any code until I approve your plan.
```

### 3.2 Worker 1 task list

#### Task S1 — Parallel multi-platform dispute submission via TinyFish batch

**Demo line:** *"47 disputes across 3 platforms in 93 seconds."*

**Depends on:** `VERIFIED_APIS.md#TinyFish-BATCH`, W1 (mock UberEats + Grubhub portals must exist).

**Scope:** `packages/scraper/**` only. Add `src/batch.ts`.

**Task order:**
1. Read the verified batch endpoint schema. Quote it back before coding.
2. Add `runTinyFishBatch(params: Array<{url, goal, browser_profile?, proxy_config?}>, opts?: {maxParallel?: number})` in `src/batch.ts`. Returns `Array<{index, status, resultJson?, error?}>` preserving input order.
3. Add `listOpenDisputesMultiPlatform(opts: {merchantId, platforms: Array<"doordash"|"ubereats"|"grubhub">}): Promise<Record<platform, DisputeCandidate[]>>` in `src/doordash.ts` (rename later if needed, but minimize renames — coordinate first).
4. Add `submitDisputesParallel(candidates: Array<{candidate, draftedText}>): Promise<SubmissionResult[]>` that chunks into batches of 8, fires in parallel.
5. Fixture fallback: if `SCRAPER_MODE=cache`, return fixtures from all 3 platforms with realistic staggered latency.
6. Fan-out logging: every sub-run tags its logs with `[batch={batchId} run={idx} platform={slug}]` so the replay UI (W11) can correlate.

**Coordination:**
- Before writing S1, confirm with Worker 3 that UberEats + Grubhub mock portals expose the same DOM contract (`data-dispute-id`, `data-charge-cents`, etc.) — see W1.
- Add platform constants to `packages/types/src/constants.ts` (`PLATFORM_URLS`, `SUPPORTED_PLATFORMS`) and coordinate a single types commit.

**Exit criteria:**
- `pnpm -F @counter/scraper test` green.
- Smoke test: `submitDisputesParallel` against 3 mock portals completes in <15s wall time with 9 candidates (3 per platform).
- `SCRAPER_MODE=cache` path works with identical shape.

**Gotcha:** TinyFish batch may return in completion order, not request order. Map results back to input index.

---

#### Task S2 — SSE event stream exposed through the Scraper interface

**Demo line:** Live browser feed + Claude reasoning overlay streaming in the dashboard.

**Depends on:** `VERIFIED_APIS.md#TinyFish-SSE-events`.

**Scope:** `packages/scraper/**` + `packages/types/src/events.ts` (coordinate).

**Task order:**
1. Add `TinyFishEvent` discriminated union type in `packages/types/src/events.ts` covering every event type in the verified list. Export from `@counter/types`.
2. In `src/tinyfish.ts`, replace the current "swallow SSE, return final resultJson" with a dual-mode API:
   - `runTinyFish(params)` — unchanged behavior (returns final result).
   - `runTinyFishStreaming(params, onEvent: (e: TinyFishEvent) => void)` — invokes the callback for every event, resolves with final result.
3. Update `src/index.ts` Scraper interface to optionally expose a streaming variant of `submitDispute`, `listOpenDisputes`, keyed by caller-supplied correlation ID.
4. Add `STREAMING_URL` extraction helper that returns the first `STREAMING_URL` event's `url` field (iframe-embeddable).
5. Write one test that calls the mock scraper with a streaming consumer and asserts at least `STARTED`, one `PROGRESS`, and `COMPLETE` fire.

**Coordination:**
- Worker 3 will iframe the STREAMING_URL. Confirm whether it requires auth (some cloud-browser providers expose it public for a short TTL, others gate by API key). Document the answer in `VERIFIED_APIS.md`.
- Worker 2 will want the `PROGRESS.purpose` field to correlate Claude reasoning with the current TinyFish step; surface that cleanly.

**Exit criteria:**
- `STREAMING_URL` can be iframe'd in `apps/web` and renders a live browser session.
- Every event the provider emits is typed in `@counter/types`.

---

#### Task S3 — Self-healing retry with strategy switch

**Demo line:** *"Portal changed overnight — watch it replan."*

**Depends on:** S2 (need event stream to detect failure types), coordination with Classifier (C1 — evaluator-optimizer loop).

**Scope:** `packages/scraper/src/resilience.ts` (new file).

**Task order:**
1. Define a `Strategy` type: `{id, browser_profile, proxy_country, goalTransform?: (goal: string) => string}`.
2. Ship 4 baked strategies:
   - `fast-lite`: lite profile, no proxy.
   - `stealth-us`: stealth profile, US residential proxy (verify country code first).
   - `stealth-rotate`: stealth + random rotation per attempt.
   - `replan-from-help-center`: different entry URL + Claude-reworded goal (delegates to Classifier C1).
3. Wrap `listOpenDisputes`, `submitDispute`, `scrapeOutcomes` in a `withStrategy(fn, {strategies, onEscalate})` helper that tries strategies in order until success.
4. Failure-mode detection: inspect SSE events for signatures (`ERROR` types, `PROGRESS.purpose` mentioning captcha / "sign in" / "unavailable").
5. On every strategy escalation, emit a `StrategyEscalated` event consumed by the web replay scrubber.
6. Telemetry: log to a new `packages/scraper/traces/` folder (gitignored) a JSONL line per run: `{runId, strategyId, outcome, durationMs, error?}`.

**Coordination:** Classifier C1 exposes `replanGoal(originalGoal, failureReason)` — call it for the `replan-from-help-center` strategy.

**Exit criteria:**
- Simulated failure test: a mock scraper that fails twice then succeeds exercises two escalations.
- On a real TinyFish run forced to fail (e.g., intentionally bad selector), strategy rotation triggers visibly in the SSE stream.

---

#### Task S4 — Evidence-bundle builder

**Demo line:** *"Before filing, Dishpute built this dossier."*

**Depends on:** `VERIFIED_APIS.md#TinyFish-capture_config`.

**Scope:** `packages/scraper/src/evidence.ts` + extension to `DisputeCandidate` type (coordinate with types).

**Task order:**
1. Add `EvidenceArtifact` type to `@counter/types`: `{kind: "screenshot"|"snapshot"|"recording"|"receipt"|"kds-timestamp", url: string, capturedAt: ISO, label: string, claudeAnnotation?: string}`.
2. Add `captureEvidence(candidate: DisputeCandidate): Promise<EvidenceArtifact[]>` that runs a TinyFish navigation with `capture_config` asserted on.
3. After capture, hand off to Classifier C2 for per-artifact annotation (`annotateArtifact(artifact): Promise<string>`).
4. Add merchant-side artifacts: mock POS receipt + mock KDS timestamp generator in `__fixtures__/evidence/` so the dashboard has something to render even with no TinyFish access.
5. Expose `bundleEvidence(candidate): Promise<{artifacts: EvidenceArtifact[], pdfUrl: string}>` — PDF rendering delegated to Web W3 via an API route.

**Coordination:**
- C2 owns annotation prompts. Agree on the `claudeAnnotation` field's max length (suggest 140 chars).
- W3 owns PDF rendering — agree on artifact ordering and layout before S4 calls the render route.

**Exit criteria:**
- For any fixture DisputeCandidate, `bundleEvidence` returns 3–6 artifacts with annotations.
- Cache mode returns pre-rendered fixture artifacts so the demo works offline.

---

#### Task S5 — "86 the salmon" multi-portal item toggle

**Demo line:** Chef shouts, 3 portals flash green in 8 seconds.

**Depends on:** S1 (batch plumbing), V1 (intent parser calls this).

**Scope:** `packages/scraper/src/menu.ts`.

**Task order:**
1. Add `set86Status(opts: {platforms: Platform[], itemNameOrSku: string, status: "86"|"available"}): Promise<Array<{platform, success, confirmationText?, error?}>>`.
2. Under the hood: fire a TinyFish batch (via S1) with per-platform goals ("Navigate to menu management, find the item matching `{name}`, toggle out-of-stock on/off").
3. Fuzzy-match the item name with Claude help if portal search fails — call into a new C-side helper or do it locally with a Levenshtein fallback.
4. Return a summary that Voice V1 renders into a confirmation utterance.
5. Add a mock implementation in `src/mock.ts` that always succeeds within 1200ms with a "Salmon Avocado Roll (Grubhub): 86'd" confirmation string.

**Coordination:**
- V1 will call this via an HTTP endpoint in `apps/web` (W4). W4 owns the route. Agree on request/response shape.

**Exit criteria:**
- Mock path succeeds end-to-end (voice → W4 route → scraper → voice confirmation).
- Real path exercised against the DoorDash mock portal in W4.

---

#### Task S6 — Holiday / emergency hours push

**Depends on:** S1 (batch), W4 admin UI.

**Scope:** `packages/scraper/src/hours.ts`.

**Task order:**
1. Add `setHours(opts: {platforms: Platform[], scope: "today"|"range", range?: {start: ISO, end: ISO}, hours: {open: HHMM, close: HHMM} | "closed"}): Promise<PlatformResult[]>`.
2. Compose per-portal TinyFish goals — each portal's hours UI lives in a different place; document selectors in `packages/scraper/src/selectors/{platform}.ts` (new folder).
3. Include Google Business Profile as a 4th target (`platform: "gbp"`).
4. Guard rail: refuse to set "closed" indefinitely without a passed-in `range.end`.

**Coordination:** W4 exposes the admin button; S6 is called via an API route.

**Exit criteria:**
- Mock "snowstorm" demo: one click flips 4 portal displays to "closed today."

---

#### Task S7 — Menu-sync with photo auto-upload

**Depends on:** C3 (per-platform description generator).

**Scope:** `packages/scraper/src/menu-sync.ts`.

**Task order:**
1. Add `syncMenuItem(item: CanonicalMenuItem, platforms: Platform[]): Promise<PlatformResult[]>`.
2. `CanonicalMenuItem` in `@counter/types` — coordinate the schema: `{id, name, category, basePriceCents, photoUrl, allergens, tags, canonicalDescription}`.
3. For each platform, call C3 to transform canonical → platform-specific form fields (DoorDash allows N chars in description, Grubhub requires category, UberEats accepts HTML, etc.).
4. Photo validation: ensure the photoUrl points to an image matching platform constraints (square for DoorDash). If not, call a utility in `packages/scraper/src/image.ts` to transform/fallback.
5. Submit via TinyFish goal — upload button interactions are fragile; fall back to CDP handoff (see `VERIFIED_APIS.md#TinyFish-CDP`) for the upload step.

**Coordination:** C3 must ship first or be stubbed.

**Exit criteria:** 1 canonical item syncs to 3 portals in a single call.

---

#### Task S8 — Review poller + reply poster (5 platforms)

**Depends on:** C4 (per-platform reply drafter).

**Scope:** `packages/scraper/src/reviews.ts`.

**Task order:**
1. Add `listNewReviews(opts: {platforms: Platform[], since: ISO}): Promise<Review[]>`.
2. `Review` type in `@counter/types`: `{platform, reviewId, rating, text, authorName, receivedAt, replyStatus}`.
3. Add `postReviewReply(opts: {platform, reviewId, replyText}): Promise<PlatformResult>`.
4. Poll platforms: Google, Yelp, DoorDash merchant portal, UberEats merchant portal, TripAdvisor. Some require Fetch-only (public reviews) while others require authenticated browser sessions.
5. Scheduled mode: `pnpm -F @counter/scraper poll-reviews` runs a single poll cycle (called from cron / GH Actions).

**Coordination:** W4 owns the approval UI; flow is `scraper polls → classifier drafts → web shows pending → operator approves → scraper posts`.

**Exit criteria:** End-to-end flow works against 2 of 5 real platforms and 5 of 5 mocks.

---

#### Task S9 — Vault-based credential handoff (zero-integration onboarding)

**Depends on:** `VERIFIED_APIS.md#TinyFish-Vault`.

**Scope:** `packages/scraper/src/vault.ts`.

**Task order:**
1. Add `storeCredential(opts: {merchantId, platform, credential: {type, ...}}): Promise<{credRef: string}>`.
2. Add `referenceCredential(credRef)` helper that returns the goal-string syntax for invoking the credential (e.g., `{{cred:doordash-merchant-123}}`).
3. Update every scraper function that logs into a portal to prepend a login step using the cred ref.
4. Write a 90-second onboarding demo script (`packages/scraper/scripts/demo-onboarding.ts`) that:
   - Accepts credentials over stdin.
   - Calls `storeCredential`.
   - Immediately fires `listOpenDisputes` with the new cred.
   - Prints elapsed seconds.

**Coordination:** W5 owns the onboarding wizard UI and calls this module through an API route.

**Exit criteria:**
- Judge types creds → first dispute fires in under 120 seconds wall time.

---

#### Task S10 — Pre-dispute prevention signal

**Depends on:** S2 (scheduled polling pattern).

**Scope:** `packages/scraper/src/prevention.ts`.

**Task order:**
1. Add `pollEarlyWarnings(merchantId): Promise<EarlyWarning[]>`.
2. `EarlyWarning` type: `{orderId, customerReportedAt, issueSummary, estimatedChargeCents, secondsUntilAutoRefund}`.
3. Scrape DoorDash's "customer reported an issue" feed (or equivalent) every 15 minutes.
4. When detected, immediately call Classifier to pre-build evidence (S4) before the charge lands.
5. Expose a stream (via the same SSE pattern as S2) that Web W7 subscribes to.

**Coordination:** W7 owns the warning feed UI.

**Exit criteria:** Mock demo: a synthetic early-warning fires → evidence pre-bundled in <30s → eventual charge auto-disputed without human intervention.

---

#### Task S11 — Computer-use fallback

**Depends on:** `VERIFIED_APIS.md#Claude-computer-use`.

**Scope:** `packages/scraper/src/computer-use.ts`.

**Task order:**
1. Add `runWithComputerUse(params: {screenshot: Buffer | url, goal: string}): Promise<{result: unknown}>` — invokes Claude's native computer-use tool against a screen (either a local headless Chromium or a TinyFish STREAMING_URL'd tab — verify which is feasible in `VERIFIED_APIS.md`).
2. Wire as a final-fallback strategy in S3 after all TinyFish strategies exhaust.
3. Safety rails: computer-use is expensive and slow — cap at 1 invocation per candidate per session.
4. Demo narration hook: emit a distinct `FALLBACK_ENGAGED` event consumed by W11 replay so the scrubber shows the handoff.

**Exit criteria:**
- One deliberately broken TinyFish path triggers computer-use and completes the dispute.

**Gotcha:** computer-use requires screen access; verify whether you can hand it an iframe'd STREAMING_URL or if you must own the Chromium instance locally. Depending on the answer, this task's architecture shifts.

---

#### Task S12 — Trace / replay data export

**Depends on:** S3 telemetry, S2 event stream.

**Scope:** `packages/scraper/src/replay.ts`.

**Task order:**
1. Define `ReplayArtifact` in `@counter/types`: `{runId, candidateId, platform, strategyHistory: StrategyEscalation[], events: TinyFishEvent[], captures: EvidenceArtifact[], startedAt, completedAt, outcome}`.
2. Persist every run to `traces/{runId}.json` AND surface a `getReplay(runId)` API.
3. Integrate with TinyFish's native step-replay (verify retention window per plan).
4. Expose both to Web W11 via a single `/api/replays/:runId` route.

**Coordination:** W11 owns the scrubber UI and C8 contributes the reasoning overlay — agree on event-time alignment.

**Exit criteria:** Any completed run is replayable end-to-end in the W11 UI.

---

## 4. Worker 2 — `packages/classifier` (Claude orchestration)

### 4.1 Kickoff prompt

```
You are Worker 2 on the Dishpute demo-polish sprint. You own packages/classifier/ only.

Read in this order:
  1. /CLAUDE.md
  2. /packages/classifier/CLAUDE.md
  3. /docs/VERIFIED_APIS.md (Claude Sonnet 4.6 section — every sub-stub)
  4. /docs/INTERFACES.md
  5. /docs/DEMO_POLISH_PLAYBOOK.md § Worker 2 (C1–C12)

Then tell me:
  - Which of C1–C12 is unblocked
  - The dependency order (C1 multi-agent orchestration is foundational — start there)
  - Which Claude features need verification before C1 (adaptive thinking, prompt caching, Skills, MCP)

Do not write any code until I approve your plan.
```

### 4.2 Worker 2 task list

#### Task C1 — Multi-agent orchestration

**Demo line:** *"Four Claude agents coordinate every dispute."*

**Depends on:** `VERIFIED_APIS.md#Claude-Sonnet-4.6-adaptive-thinking`, Anthropic multi-agent pattern.

**Scope:** `packages/classifier/src/orchestrator.ts`.

**Task order:**
1. Design the agent DAG: `Classifier → Evidence → Submitter → Negotiator`, with a lead agent delegating sub-tasks.
2. Implement each sub-agent as a separate prompt in `packages/classifier/src/agents/{role}.ts`, each with a clear input/output schema using Sonnet 4.6 structured outputs (`output_config.format`).
3. Lead agent = Sonnet 4.6 with adaptive thinking set to the verified parameter — auto-thinks harder on ambiguous inputs.
4. Sub-agents can be Haiku 4.5 where cheap, Sonnet 4.6 where they need to reason (specify per agent in config).
5. Expose `classifyAndDraft(candidate): Promise<ClassifiedDispute>` as the single public entry point — same signature the web app already consumes, but internally runs the multi-agent flow.
6. Emit `AgentEvent` stream (via an async iterator or callback) so W10 can render the DAG lighting up.

**Coordination:**
- S3 calls `replanGoal(originalGoal, failureReason)` — export this from C1.
- W10 renders the DAG.

**Exit criteria:**
- End-to-end dispute classification on a fixture candidate exercises all 4 sub-agents.
- Agent events visible via the streaming interface.

---

#### Task C2 — Evidence annotation

**Depends on:** S4.

**Scope:** `packages/classifier/src/evidence-annotator.ts`.

**Task order:**
1. Add `annotateArtifact(artifact: EvidenceArtifact): Promise<string>` — single sentence ≤140 chars.
2. Use Claude vision for screenshot/snapshot artifacts; use prompt caching (C10) to cache the system prompt across all artifacts in a bundle.
3. For receipts: extract itemized lines, compare to `candidate.itemsReported`, flag discrepancies.

**Exit criteria:** Every fixture artifact returns a non-empty annotation.

---

#### Task C3 — Per-platform menu-description generator

**Depends on:** S7.

**Scope:** `packages/classifier/src/menu-descriptions.ts`.

**Task order:**
1. Add `renderForPlatform(item: CanonicalMenuItem, platform: Platform): Promise<PlatformMenuItem>`.
2. Platform specs (encode as Agent Skills if C12 ships first — dynamic loading):
   - DoorDash: ≤ 255 chars, no HTML.
   - UberEats: allows limited HTML, encourage emoji.
   - Grubhub: requires category tag, dietary flags.
3. Claude temperature 0.2, strict structured output, schema validation before returning.

---

#### Task C4 — Per-platform review reply drafter

**Depends on:** S8.

**Scope:** `packages/classifier/src/review-reply.ts`.

**Task order:**
1. Add `draftReply(review: Review, merchantVoice: {tone, signOff}): Promise<{text, confidence, escalate: boolean}>`.
2. Per-platform voice: Google = formal, DoorDash = warm, Yelp = careful (legal exposure risk).
3. Escalation: if review mentions allergic reaction, illness, or legal threat — `escalate: true`, do NOT auto-post even if operator is set to auto-approve.
4. Encode voice rules as an Agent Skill (`skills/review-voice/SKILL.md`) for C12.

**Exit criteria:** Given 10 fixture reviews across 3 platforms, no escalation signal is missed; tone reads correctly per platform.

---

#### Task C5 — Before/after P&L delta

**Depends on:** DB access to past disputes (via the existing SQLite schema).

**Scope:** `packages/classifier/src/pnl.ts`.

**Task order:**
1. Add `computePnLDelta(merchantId, windowDays): Promise<{beforeCents, afterCents, recoveredCents, preventedCents, annualizedCents, narrativeText}>`.
2. "Before" = pre-Dishpute baseline from a seeded value in `packages/types/src/fixtures.ts`.
3. "After" = sum of approved dispute refunds + prevention signal wins.
4. Claude-generated one-paragraph narrative for the dashboard (use prompt caching on the system prompt).

**Coordination:** W9 renders this.

---

#### Task C6 — Missing-item callback trigger logic

**Depends on:** V6.

**Scope:** `packages/classifier/src/callback-trigger.ts`.

**Task order:**
1. Add `shouldCallback(review: Review | Dispute): Promise<{call: boolean, reason: string, suggestedScriptVars: Record<string, string>}>`.
2. Rules (encoded as a Claude prompt that can explain its decision):
   - 1–2 star review or denied dispute + $ value > threshold → call.
   - Language inference from text → pass to V6 so ElevenLabs speaks it.
   - Skip if customer has opted out or if call placed in last 7 days.
3. Emit `CallbackTriggered` event.

---

#### Task C7 — Daily briefing composer

**Depends on:** C5.

**Scope:** `packages/classifier/src/briefing.ts`.

**Task order:**
1. Add `composeBriefing(merchantId, date): Promise<{spokenScript, ssml?, summaryBullets: string[]}>`.
2. Pull yesterday's disputes + reviews + 86 events + P&L delta; render into a 45-second spoken script.
3. Use ElevenLabs v3 expressive tags if they improve delivery — verify tag syntax.

**Coordination:** V7 calls this at 7am via a cron/webhook.

---

#### Task C8 — Adaptive-thinking reasoning stream

**Depends on:** `VERIFIED_APIS.md#Claude-adaptive-thinking`.

**Scope:** `packages/classifier/src/thinking-stream.ts`.

**Task order:**
1. Wrap every orchestrator call with the verified thinking configuration.
2. Expose `streamThinking(input): AsyncIterable<ThinkingBlock>` — emits thinking blocks as they arrive (respect whether the API streams them or returns post-hoc — verify).
3. Redact any PII before exposing to the frontend.
4. Ship a summarizer that condenses a thinking block to ≤2 sentences for the W10 side panel.

---

#### Task C9 — Human-in-the-loop confidence gate

**Depends on:** V5, V8.

**Scope:** `packages/classifier/src/gate.ts`.

**Task order:**
1. Add `shouldConfirm(candidate, draft, confidence): "auto" | "voice-confirm" | "skip"`.
2. Policy: dispute > $50 OR merit 60–75 → `voice-confirm`; merit < 40 → `skip`; else `auto`.
3. Call V5/V8 through a webhook when `voice-confirm`; resume the pipeline on webhook callback.

---

#### Task C10 — Prompt caching + cost telemetry

**Depends on:** `VERIFIED_APIS.md#Claude-prompt-caching`.

**Scope:** `packages/classifier/src/cost-telemetry.ts` + `src/caching.ts`.

**Task order:**
1. Identify the big cacheable blocks: DoorDash dispute policy PDF, per-platform Skills (when C12 lands), merchant context.
2. Attach `cache_control` to system-prompt blocks.
3. After every call, parse `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens` (verify field names) and log `{runId, model, inputTokens, outputTokens, cacheReadTokens, cacheCreateTokens, estimatedCostUsd}` to a telemetry sink.
4. Expose `getSessionCost(sessionId): Promise<{actualCostUsd, hypotheticalCostNoCachingUsd, savingsUsd}>` for W12.

---

#### Task C11 — Custom Dishpute MCP server

**Demo line:** *"Any Claude instance anywhere can file a dispute for its restaurant."*

**Depends on:** `VERIFIED_APIS.md#Anthropic-MCP-spec`.

**Scope:** `packages/classifier/src/mcp-server.ts` + a new entry point in `package.json` (`dishpute-mcp`).

**Task order:**
1. Follow the verified MCP protocol version (transport: HTTP + SSE if available; stdio as fallback).
2. Expose tools:
   - `list_open_disputes({merchantId, platform?})`
   - `get_dispute({disputeId})`
   - `draft_dispute_response({disputeId})`
   - `file_dispute({disputeId, draft})`
   - `get_recovered_amount({merchantId, windowDays})`
   - `trigger_briefing({merchantId})`
3. Each tool should be a thin wrapper around existing classifier/scraper functions — do NOT duplicate logic.
4. Ship a demo where `claude` CLI is pointed at the local MCP server and asks "how much did Dishpute recover for House of Curry this week?"
5. Pair with Stripe's official remote MCP in the demo narrative (no code integration required — just the positioning slide W6).

---

#### Task C12 — Agent Skills per platform

**Depends on:** `VERIFIED_APIS.md#Claude-Skills`.

**Scope:** `packages/classifier/skills/` folder with per-platform subfolders.

**Task order:**
1. Create `skills/doordash-dispute/SKILL.md`, `skills/ubereats-dispute/SKILL.md`, `skills/grubhub-dispute/SKILL.md`, `skills/review-voice/SKILL.md`.
2. Each SKILL.md has: when-to-use trigger, platform policy highlights (paraphrased, not verbatim from the provider), dispute-language conventions, allowed evidence types, escalation thresholds.
3. Set the verified Skills beta header in the Anthropic client config.
4. Refactor orchestrator so Claude auto-loads the right skill based on `candidate.platform`.

---

## 5. Worker 3 — `apps/web` (Next.js dashboard + mock portals)

### 5.1 Kickoff prompt

```
You are Worker 3 on the Dishpute demo-polish sprint. You own apps/web/ only.

Read in this order:
  1. /CLAUDE.md
  2. /apps/web/CLAUDE.md
  3. /docs/VERIFIED_APIS.md (Stripe + TinyFish SSE sections)
  4. /docs/INTERFACES.md
  5. /docs/DEMO_POLISH_PLAYBOOK.md § Worker 3 (W1–W12)

Then tell me:
  - Which of W1–W12 is unblocked
  - Dependency order (W1 mock portals unblock S1/S5/S6/S7/S8; start there)
  - Any new npm deps you need and why

Do not write code until I approve your plan.
```

### 5.2 Worker 3 task list

#### Task W1 — Mock UberEats + Grubhub portals

**Unblocks:** S1, S5, S6, S7, S8.

**Scope:** `apps/web/app/mock-portal-ubereats/**` and `apps/web/app/mock-portal-grubhub/**`.

**Task order:**
1. Mirror the existing DoorDash mock portal's DOM contract (`data-dispute-id`, `data-order-id`, `data-charge-cents`, `data-charge-type`, etc.).
2. Differentiate visually: UberEats = black-and-white minimal, Grubhub = orange accents. Makes the 3-up grid (W2) look distinct on stage.
3. Seed data: use a new `FIXTURE_DISPUTES_UBEREATS` and `FIXTURE_DISPUTES_GRUBHUB` in `@counter/types` (coordinate types commit).
4. Expose at least one page per portal with hours / menu / reviews surfaces so S6/S7/S8 have targets.

**Coordination:** With Worker 1 — agree on DOM selector contract BEFORE implementing.

**Exit criteria:** TinyFish scraper (real or mock) reads disputes from both new portals successfully.

---

#### Task W2 — 3-up live TinyFish feed with reasoning overlay

**Depends on:** W1, S2.

**Scope:** `apps/web/app/live/**` and `components/LiveGrid.tsx`.

**Task order:**
1. Page at `/live` with a grid of 3 iframes for the 3 platforms, each wired to a TinyFish `STREAMING_URL`.
2. Overlay: current goal string (from S2 events), current step number, reasoning snippet (from C8) semi-transparent over each iframe.
3. "Fire batch" button kicks off `submitDisputesParallel` (S1) across all 3 platforms with preseeded demo candidates.
4. Big progress counter: "12 of 30 complete · $847 recovered."
5. Use `motion` for the counter animation (not framer-motion).

**Gotcha:** iframe'ing STREAMING_URL may fail due to X-Frame-Options. If so, render a canvas that polls screenshot frames from S2 events instead.

---

#### Task W3 — Evidence-bundle PDF render

**Depends on:** S4, C2.

**Scope:** `apps/web/app/api/evidence/route.ts` + `components/EvidenceBundle.tsx`.

**Task order:**
1. API route `POST /api/evidence` accepts a `DisputeCandidate`, calls S4's `bundleEvidence`, renders a PDF with a cover sheet + one page per artifact.
2. Use a lightweight server-side renderer (`@react-pdf/renderer` or headless Chromium via Puppeteer — pick one, document the choice).
3. Dashboard button per dispute: "Preview evidence bundle" → opens inline modal showing the PDF.

---

#### Task W4 — Multi-portal ops admin UIs (86 / hours / menu / reviews)

**Depends on:** S5, S6, S7, S8.

**Scope:** `apps/web/app/ops/**`.

**Task order:**
1. `/ops/86` — list of menu items with a big "86" toggle per item; platform indicators below each. Hitting toggle calls S5 via `/api/ops/86`.
2. `/ops/hours` — calendar view with "Close for the day" / "Set holiday hours" — calls S6.
3. `/ops/menu` — menu item upload form with drag-drop photo — calls S7.
4. `/ops/reviews` — inbox of new reviews awaiting approval, drafted reply pre-filled — calls S8 on approve.

**UI:** use shadcn components. Do not over-design — the /live page is the star; these are polish.

---

#### Task W5 — Zero-integration onboarding wizard

**Depends on:** S9.

**Scope:** `apps/web/app/onboarding/**`.

**Task order:**
1. 3-step wizard: (a) restaurant name + Stripe Connect setup (existing), (b) DoorDash login via TinyFish Vault, (c) first dispute fires live with a countdown timer.
2. Stopwatch visibly starts on step (a) and freezes on first-dispute-fired event. Target: <90 seconds.
3. Hard requirement: no configuration the judge could plausibly need to read about. Pre-filled everywhere.

---

#### Task W6 — "API-proof" landing section

**Depends on:** — (pure positioning).

**Scope:** `apps/web/app/(marketing)/why/page.tsx`.

**Task order:**
1. Landing section with a hero comparison table: Dishpute vs. Loop vs. Voosh across {integration time, independent-restaurant coverage, browser-agent execution, voice escalation, per-platform outage behavior}.
2. Callout box: *"When DoorDash's partner API throttles, Loop and Voosh go dark. Dishpute doesn't use the partner API — it pilots your authenticated session. We keep working."*
3. Link this from the dashboard footer — judges will browse.

---

#### Task W7 — Pre-dispute prevention early-warning feed

**Depends on:** S10.

**Scope:** `apps/web/app/warnings/**` + live component in dashboard sidebar.

**Task order:**
1. Subscribe to S10's SSE stream.
2. Sidebar widget: "⚠ 3 orders flagged — auto-refund landing in 8m 12s."
3. Click-through → evidence pre-bundled view; one-click file-now button.

---

#### Task W8 — "Recovered today" counter + Stripe webhook

**Demo line:** *real money on the big screen.*

**Depends on:** `VERIFIED_APIS.md#Stripe-Connect-webhooks-test-mode`.

**Scope:** `apps/web/app/api/stripe/webhook/route.ts` + `components/RecoveredCounter.tsx`.

**Task order:**
1. Webhook route verifies signature, listens for `transfer.created` (or verified correct event), updates a Dishpute DB row with the recovered cents and a running total.
2. Dashboard counter subscribes via SSE or poll to `/api/stats/recovered-today` and animates on change (use `motion` spring).
3. Also trigger V2 SMS fan-out on the same webhook event — V2 exposes `POST /api/voice/sms-fanout`.
4. Include a "demo arm" button that fires Stripe CLI test events in sequence for rehearsal.

---

#### Task W9 — Before/after P&L comparison

**Depends on:** C5.

**Scope:** `apps/web/app/pnl/page.tsx`.

**Task order:**
1. Side-by-side cards: "Before Dishpute" with pre-seeded merchant baseline, "After Dishpute" with live-computed recovered + prevented numbers.
2. Annualization callout: "+$14,924 annualized at current run-rate."
3. Claude-generated narrative paragraph below.

---

#### Task W10 — Adaptive-thinking reasoning panel

**Depends on:** C8.

**Scope:** `components/ReasoningPanel.tsx`.

**Task order:**
1. Right-side collapsible panel on the dispute-detail page.
2. Streams thinking blocks from C8 as they arrive.
3. Visual: token stream with a subtle pulse when adaptive-thinking escalates to "high."
4. Small badge: "Thinking: auto" → "Thinking: high" when escalation occurs.

---

#### Task W11 — Replay mode / timeline scrubber

**Depends on:** S12, C8.

**Scope:** `apps/web/app/replay/[runId]/page.tsx`.

**Task order:**
1. Timeline scrubber at the bottom — drag to any timestamp in the run.
2. Three stacked panes: TinyFish screenshot at that timestamp (top), Claude reasoning snippet (middle), API call trace (bottom).
3. Playback controls: 0.5x, 1x, 2x, 4x.
4. Distinct marker on strategy escalations (S3) and computer-use fallbacks (S11).

---

#### Task W12 — Prompt caching cost counter

**Depends on:** C10.

**Scope:** `components/CostBadge.tsx`.

**Task order:**
1. Floating badge in the dashboard footer: "This session: $0.03 · would have been $0.30 without caching (90% saved)."
2. Subscribe to C10's telemetry stream.
3. Tooltip on hover explains what caching is — good for judge Q&A.

---

## 6. Worker 4 — `apps/voice` (ElevenLabs + Twilio)

### 6.1 Kickoff prompt

```
You are Worker 4 on the Dishpute demo-polish sprint. You own apps/voice/ only.

Read in this order:
  1. /CLAUDE.md
  2. /apps/voice/CLAUDE.md
  3. /docs/VERIFIED_APIS.md (ElevenLabs + Twilio sections — every sub-stub)
  4. /docs/INTERFACES.md
  5. /docs/DEMO_POLISH_PLAYBOOK.md § Worker 4 (V1–V8)

Then tell me:
  - Which of V1–V8 is unblocked
  - Which ElevenLabs / Twilio facts you need to verify first
  - Whether any tasks require ngrok-dependent setup (inbound endpoints do)

Do not write code until I approve your plan.
```

### 6.2 Worker 4 task list

#### Task V1 — "86 the salmon" STT + intent parser

**Depends on:** S5 (executor), W4 (route).

**Scope:** `apps/voice/src/stt-86.ts`.

**Task order:**
1. ElevenLabs STT endpoint (verify exact method — live stream vs POST audio).
2. Intent parser (tiny Claude Haiku 4.5 call): extract `{action: "86"|"unavailable"|"available", itemPhrase, platformsFilter?}`.
3. POST to `/api/ops/86` in the web app with the parsed intent.
4. TTS confirmation back to the chef via the same call: "Salmon Avocado Roll is 86'd on DoorDash, UberEats, Grubhub. Saved you about $40."

---

#### Task V2 — Judges' phones SMS fan-out

**Depends on:** Stripe webhook (W8).

**Scope:** `apps/voice/src/sms-fanout.ts`.

**Task order:**
1. Endpoint `POST /api/voice/sms-fanout` accepts `{amountCents, disputeId, merchantName}`.
2. Sends via Twilio Messaging Service to a configured list of `JUDGE_PHONE_NUMBERS` (env var, CSV).
3. Include a unique dispute-level idempotency key to avoid double-sends during rehearsal.
4. Respect STOP / opt-out compliance per Twilio docs.

**Rehearsal hygiene:** Include a dry-run env flag `SMS_DRY_RUN=1` that logs to console instead of sending — use it until the day-of.

---

#### Task V3 — Live phone number judges can dial

**Depends on:** `VERIFIED_APIS.md#ElevenLabs-inbound`.

**Scope:** `apps/voice/src/inbound.ts` + ngrok tunnel.

**Task order:**
1. Configure an ElevenLabs agent for inbound: system prompt is "You are Dishpute's demo line. Politely explain what Dishpute does and offer to place a sample dispute against House of Curry's mock portal."
2. Attach tools via the verified MCP / webhook mechanism — one tool calls C1 for a live classification, one calls S1 for submission.
3. Provision a Twilio phone number routing inbound to the ElevenLabs agent.
4. Put the number large on a slide.

---

#### Task V4 — GibberLink agent-to-agent detection + expert mode

**Demo centerpiece.**

**Depends on:** V3-style agent plumbing for outbound.

**Scope:** `apps/voice/src/gibberlink.ts`.

**Task order:**
1. During an outbound support-escalation call, inspect early ElevenLabs STT output for AI-speech markers (cadence, canned phrases, STT confidence curves). If a simpler heuristic — the AI identifying itself as "DoorDash virtual assistant" — works, use that first.
2. On detection, swap the agent's system prompt to `prompts/gibberlink-expert.md` (denser, policy-citing, faster cadence, uses the DoorDash error-charge policy code directly — e.g., "Per section 4.2 of the error-charge policy…").
3. Record both call legs separately for the replay UI.
4. Stage fallback: an `ELEVENLABS_AGENT_MODE=expert-always` env flag forces expert mode from the first token for rehearsal certainty.

**Ethics/compliance:** check jurisdiction rules around two-party consent for recording. Add a one-line pre-roll: "This call may be recorded for quality purposes."

---

#### Task V5 — Confirmation call for disputes >$50

**Depends on:** C9.

**Scope:** `apps/voice/src/confirm.ts`.

**Task order:**
1. Endpoint `POST /api/voice/confirm` accepts `{merchantPhone, disputeSummary, amountCents}`.
2. ElevenLabs outbound call reads the summary, asks yes/no with strict DTMF fallback ("Press 1 for yes, 2 for no").
3. Webhook back to C9 on answer — resume or skip.

---

#### Task V6 — Missing-item save-the-relationship outbound

**Depends on:** C6.

**Scope:** `apps/voice/src/save-the-relationship.ts`.

**Task order:**
1. Endpoint `POST /api/voice/save` accepts `{customerPhone, reviewOrDisputeText, merchantName, language?}`.
2. Use v3 expressive tags (`[warm]`, `[sigh]`) — verify tag syntax.
3. Multilingual: auto-detect or receive language from C6; fall back to English.
4. Tool call during conversation: `issue_credit({customerId, amountCents})` → Stripe test-mode credit.

**Compliance:** confirm customer opted into callbacks (the fixture should pre-mark consent).

---

#### Task V7 — AI daily briefing at 7am

**Depends on:** C7.

**Scope:** `apps/voice/src/briefing.ts` + cron.

**Task order:**
1. Nightly cron (7am local) via GH Actions or a lightweight scheduler (`cron` npm + `pm2`, or just a `node-cron` worker) calls C7 → gets the script → places an outbound ElevenLabs call.
2. Use ElevenLabs batch calling if multiple merchants (currently just 1 for demo).
3. Fallback: if the call fails, deliver via SMS.

---

#### Task V8 — Human-in-the-loop confidence-gate ring-out

**Depends on:** C9.

**Scope:** `apps/voice/src/hitl.ts`.

**Task order:**
1. Similar to V5 but triggered by C9's confidence gate, not a $ threshold — wider set of reasons.
2. Conversation supports open-ended answers: "It's legit, file it" / "Skip this one, customer's a known scammer" / "Let me look — text me the link."
3. On the third response variant, fall back to SMS-with-deeplink.

---

## 7. Coordination matrix (who needs what from whom)

| Needs… | From worker | Task blocking |
|---|---|---|
| DOM contract for new mock portals | Worker 3 → Worker 1 | S1, S5, S6, S7, S8 |
| Mock portals deployed | Worker 3 → Worker 1 | all multi-platform scraping |
| `DisputeCandidate` & new types in `@counter/types` | ad-hoc → all | any cross-worker feature |
| `TinyFishEvent` union type | Worker 1 → Worker 3 | W2, W11 |
| Streaming URL embedding pattern | Worker 1 → Worker 3 | W2 |
| Evidence artifact schema | Worker 1 + 2 → Worker 3 | W3 |
| Agent event stream for DAG render | Worker 2 → Worker 3 | W10 |
| Cost telemetry stream | Worker 2 → Worker 3 | W12 |
| Webhook payload for SMS fan-out | Worker 3 → Worker 4 | V2 |
| 86 API route | Worker 3 → Worker 4 | V1 |
| Confirmation API route | Worker 2 → Worker 4 | V5, V8 |
| Briefing composer endpoint | Worker 2 → Worker 4 | V7 |

**Rule:** any cross-worker contract must land in `packages/types` as a committed PR before the consumer starts. The types commit should be small, scoped, and merged fast.

---

## 8. Rehearsal integration order (recommended)

For a polished 10-minute demo using the Top 10 subset:

1. **Cold open** — 15-second Zoom clip of the real merchant (no engineering). *Stretch item 11.*
2. **Zero-integration onboarding** — W5 + S9, 90 seconds on stage. *Top 10 #8.*
3. **Three browsers firing in parallel** — W2 + S1. *Top 10 #1.*
4. **Recovered counter ticks up; judges' phones buzz** — W8 + V2. *Top 10 #2.*
5. **Confirmation call to the owner before $85 dispute** — V5 + C9. *Top 10 #4.*
6. **One dispute denied — GibberLink expert mode call** — V4. *Top 10 #3.*
7. **"86 the salmon" chef voice moment** — V1 + S5. *Top 10 #5.*
8. **Missing-item customer save call** — V6 + C6. *Top 10 #7.*
9. **Self-healing retry live** — S3. *Top 10 #9.*
10. **Replay + reasoning scrubber as Q&A ammunition** — W11 + C8. *Top 10 #6.*
11. **Close on MCP server + Stripe MCP architecture slide** — C11 + W6. *Top 10 #10.*

The remaining 18 features are depth for Q&A and post-pitch conversations with sponsor reps — don't cram them into the 10 minutes.

---

## 9. Quality bar per task (definition of done)

Every task is done when **all** of the following are true:

- Code builds: `pnpm -F <package> build` green.
- Tests pass: `pnpm -F <package> test` green (at minimum a smoke test per new public function).
- Fixtures added: any external dependency has a fixture so downstream workers can build.
- `docs/VERIFIED_APIS.md` contains the verified facts used by this task.
- At least one conventional commit on the task's branch.
- Cache / demo-safe mode works: setting the project's env kill-switches still produces a recognizable demo flow.
- `README.md` (the root one or `apps/*/README.md`) mentions the new feature with a one-line description and a demo trigger.

---

## 10. A note on scope honesty

Quality over speed, no hard deadline — but 44 task slots is still 4–6 weeks of part-time work even with Claude Code. Prioritize in this order:

1. **Top 10 demo path** (tasks marked in §8) — ships the 10-minute pitch.
2. **Section 1 (Scraper) tasks S2, S3, S12** — biggest TinyFish-depth story for sponsor evaluation.
3. **Section 2 (Classifier) C1, C11, C12** — biggest Claude / Anthropic showcase.
4. **Everything else** — depth and portfolio ammunition.

If budget ever compresses, cut from the tail of the list rather than spreading thinner across all 28.
