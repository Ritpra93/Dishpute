# Counter — Verification Pass Report

**Generated:** hour ~20 of the hackathon, pre-demo.
**Goal:** prove the stage demo survives the 10-minute pitch. Adversarial mindset; happy-path only isn't enough.

**Overall status: green.** 70 tests pass across the workspace, including one end-to-end rehearsal simulator that replays the full demo (Beats 2 → 4) against real code with ElevenLabs mocked at the fetch layer.

```
pnpm test:all   → 5 of 6 packages green (packages/types has no tests, only typecheck)
                  packages/scraper:    12 passed
                  packages/classifier: 7 assertion groups passed
                  apps/voice:          9 passed
                  apps/web:            42 passed (12 demo-beats + 7 contracts + 17 edges + 1 rehearsal + 5 perf)
                  Total:               70 passed

pnpm test:demo  → rehearsal.test.ts: 1 passed (885ms)
                  [rehearsal] scan=811ms submit-all=31ms escalate=28ms disputes=30 submitted=22 recoverableCents=89200
                  [webhook]  post_call_transcription — conversation=conv_rehearsal_42 candidate=disp_0017 outcome=recovered
```

---

## 1. Changes applied inline (fix everything, document everything)

### Critical bugs found & fixed during the pass

| # | File | Bug | Fix | Impact |
|---|---|---|---|---|
| **1** | `apps/voice/src/routes/webhooks.ts` | `client.webhooks.constructEvent(...)` called without `await`. Real SDK is async → `event.type` is always `undefined` → post-call handler's `if (event.type === "post_call_transcription")` branch never enters → transcripts never persist to `voice_calls`. | Added `await`. | Demo Beat 4 aftermath — transcript wouldn't land in SQLite after a live call without this fix. |
| **2** | `apps/voice/src/server.ts` | `express.json()` mounted globally before the webhooks router. Raw-body parser on `/webhooks/elevenlabs/post-call` runs against an already-consumed stream. Signature verification fails silently every time because `req.body.toString("utf-8")` returns `"[object Object]"`. | Mount `webhooksRouter` BEFORE `express.json()`. | Same as #1 — signature verification path was 100% dead in production. |
| **3** | `apps/web/lib/db.ts` | DB path was `process.cwd()/counter.db` → resolves to `apps/web/counter.db` during `next dev`. `apps/voice/src/db.ts` uses repo-root `counter.db`. **The two apps never shared a DB.** | Use `path.join(process.cwd(), "..", "..", "counter.db")` (override via `DB_PATH` env). | Voice-call records were writing to a file the dashboard never read. Dashboard stats never reflected recovered-via-voice money. |
| **4** | `apps/web/app/api/disputes/[id]/escalate/route.ts` | Payload to voice was `{candidateId, candidate, classification}`. Voice `/calls/outbound` expects `{toNumber, candidateId, caseNumber, merchantName, denialReason}`. The call went through with every defaulted field, so the agent would say *"case disp_0008, denial reason: No reason provided"* instead of the demo script's narrative. | Rewrote payload. Derive `caseNumber` from `orderId` (strip `ord_` prefix). Build a plausible `denialReason` from classification. | Beat 4 climax now speaks realistically. |
| **5** | `apps/voice/test/smoke.test.ts` | Test imported `createApp` that `server.ts` didn't export (server called `app.listen` at module level). Asserted the old stub's `{phoneNumber, context}` body shape that the current route no longer accepts. `pnpm test` would fail for any teammate on a fresh clone. | Refactored `server.ts` to export `createApp`; kept a `require.main === module` guard so `pnpm dev`/`start` still auto-listens. Rewrote smoke test with 9 assertions across every route, mocking ElevenLabs via `vi.mock`. | Root `pnpm test` no longer fails. |

### Architectural consolidation (the "migrate" scope)

| File | Change | Why |
|---|---|---|
| `packages/types/src/fixtures.ts` | Replaced `dc-001…dc-030` with the `disp_0001…disp_0030` fixture set. | Single source of truth. `apps/web` had the newer, hand-tuned set that matches the demo narrative. |
| `packages/types/src/index.ts` | Added `EnrichedDispute` and `DashboardStats` exports. | These cross module boundaries — don't belong only to `apps/web`. |
| `packages/types/package.json` | Point `main`/`types`/`exports` at `./src/index.ts`. | Matches classifier pattern; avoids a build step before dev. |
| `packages/classifier/src/mock.ts` | Ported the `disp_*` SEEDS (22 high-merit / 4 human-review / 4 skip) from `apps/web/lib/mock-classifier.ts`. Preserved the $892 / 22-count runtime guardrail. | Single classifier mock everyone uses. |
| `packages/classifier/src/index.ts` | `createMockClassifier` now accepts `{ latencyMs? }` (used by `apps/web/app/api/scan/route.ts`). | Backwards compatibility. |
| `packages/classifier/test/smoke.test.ts` | Rewritten for `disp_*` ID space (was testing `dc-001`'s $52.00 — no longer exists). | Match new fixture set. |
| `packages/classifier/test/live.test.ts` | Target candidate changed from `dc-006` → `disp_0004`. | Same. |
| `packages/scraper/src/mock.ts` | `DEMO_OUTCOMES` rewired: `disp_0001/4/11` approved (with realistic refund amounts matching classifier's `recoverableCents`), `disp_0008/17/23` denied, 16 pending, rest fallback pending. Exports `DEMO_APPROVED_IDS` and `DEMO_DENIED_IDS` as the canonical ID lists. | Makes `scrapeOutcomes` return real $ for approved (old mock returned `$0`, which would silently zero out `totalRealizedCents` if anyone wired it into the live flow). |
| `packages/scraper/src/index.ts` | Re-exports `DEMO_APPROVED_IDS`, `DEMO_DENIED_IDS`. | Downstream consumers. |
| `packages/scraper/package.json` | Point `main`/`types`/`exports` at `./src/index.ts`. | Same rationale as types. |
| `packages/scraper/test/smoke.test.ts` | Updated distribution assertions: 15/6/4/3/2 charge-type split (was 21/3/4/1/1 for the old `dc-*` fixtures); 3 approved / 3 denied / 24 pending; $211.90 recovered on approved. | Reflects new fixtures. |
| `apps/web/package.json` | Added `@counter/types`, `@counter/scraper`, `@counter/classifier` as `workspace:*` deps. Added `vitest` devDep, `test` and `test:demo` scripts. | Dashboard now consumes the workspace packages. |
| `apps/web/lib/types.ts` | Collapsed from 155-line inlined copy to `export * from "@counter/types"` + 2 type re-exports. | Pass-through only. |
| `apps/web/lib/fixtures.ts` | Collapsed from 446-line inlined copy to `export { FIXTURE_DISPUTES } from "@counter/types"`. | Pass-through only. |
| `apps/web/lib/mock-classifier.ts` | Collapsed from 512-line inlined copy to re-exports from `@counter/classifier`. | Pass-through only. |
| `apps/web/lib/mock-scraper.ts` | Collapsed from 117-line inlined copy to re-exports from `@counter/scraper`. | Pass-through only. |
| `apps/web/app/api/disputes/submit-all/route.ts`, `apps/web/app/api/disputes/[id]/submit/route.ts`, `apps/web/scripts/seed-demo.ts` | Use `DEMO_APPROVED_IDS` / `DEMO_DENIED_IDS` imports instead of hardcoded `Set(...)`. | Single source. |
| `apps/web/lib/db.ts` | Uses `DB_PATH` env override; schema now read from `../../packages/types/schema.sql`. | Tests can use isolated DBs; one canonical schema. |
| `apps/web/vitest.config.ts` | New file. | Vitest runner for apps/web tests. |
| Root `package.json` | Added `test:all` and `test:demo` scripts. | One-shot suite runners. |

### New test files written this pass

```
apps/web/test/helpers.ts          # shared utilities (temp DB, route invokers)
apps/web/test/demo-beats.test.ts  # P1 — 12 tests, walks Beats 2–4
apps/web/test/contracts.test.ts   # P2 —  7 tests, each module boundary
apps/web/test/edges.test.ts       # P3 — 17 tests, adversarial edges
apps/web/test/rehearsal.test.ts   # P4 —  1 end-to-end test (pass/fail gate)
apps/web/test/perf.test.ts        # P5 —  5 timing budget assertions
apps/voice/test/smoke.test.ts     # rewritten — 9 tests
```

---

## 2. Tests that passed (with cited output)

### Packages — `packages/scraper`

```
 ✓ test/smoke.test.ts (12 tests) 4220ms
   ✓ createMockScraper > listOpenDisputes returns 30 records
   ✓ createMockScraper > all records have required fields
   ✓ createMockScraper > fixture has correct charge-type distribution (matches packages/types/CLAUDE.md spec)
   ✓ createMockScraper > submitDispute returns submitted status with confirmation ID
   ✓ createMockScraper > scrapeOutcomes returns correct outcomes for the three canonical demo IDs
   ✓ createMockScraper > scrapeOutcomes returns all 30 fixture IDs with correct demo distribution
   ✓ createMockScraper > scrapeOutcomes falls back to pending for unknown IDs
   ✓ createMockScraper > DEMO_OUTCOMES_SUMMARY totals are consistent
   ✓ createMockScraper > exported DEMO_APPROVED_IDS and DEMO_DENIED_IDS are the canonical 3+3 sets
   ✓ createScraper SCRAPER_MODE=cache > listOpenDisputes returns 30 fixture records
   ✓ createScraper SCRAPER_MODE=cache > submitDispute returns submitted with CONF ID
   ✓ createScraper SCRAPER_MODE=cache > scrapeOutcomes returns demo outcomes (not all-pending)
```

### Packages — `packages/classifier`

```
Running classifier smoke tests...
✓ classifyMany returns 30 results
✓ All candidateIds match FIXTURE_DISPUTES
✓ Merit distribution: 22 auto-submit | 4 human-review | 4 skip
✓ Total recoverable from auto-submit tier: $892.00
✓ All skip-tier entries have recoverableCents = 0
✓ All results have valid field shapes
✓ classify() works for single candidate (disp_0001: $53.90 recoverable)
All smoke tests passed.
```

### Apps — `apps/voice` (9 tests, all passed)

```
 ✓ test/smoke.test.ts (9 tests) 37ms
   ✓ GET /health > returns ok
   ✓ GET /api/vanta/trust-center > returns the mocked Vanta payload with expected shape
   ✓ POST /tools/lookup_case > returns a concise, speakable case summary
   ✓ POST /tools/lookup_case > handles missing caseId gracefully (returns 200 with fallback)
   ✓ POST /tools/reference_evidence > returns citations array
   ✓ POST /tools/escalate_to_supervisor > returns an escalation ticket ID
   ✓ POST /calls/outbound > accepts the contract payload from apps/web and returns a VoiceCallRecord shape
   ✓ POST /webhooks/elevenlabs/post-call > accepts post_call_transcription events, persists to voice_calls, returns 200
   ✓ POST /webhooks/elevenlabs/post-call > returns 200 even on missing signature (ElevenLabs never retries 4xx)

[webhook] post_call_transcription — conversation=conv_test_9876 candidate=disp_smoke_test outcome=recovered
```

### Apps — `apps/web` (42 tests, all passed)

**P1 Demo Beats (12):** merit distribution · 22 submitted · $892 math · 3 denied all eligible for voice · escalate payload contract · payload has no stale `candidate`/`classification` keys · stubbed mode when URL unset · disp_0008 resolves to ord_4561.

**P2 Contracts (7):** scraper→repo round-trip · upsert idempotency · classifier→repo round-trip · drafted-text survives JSON · escalate exactly 5 fields · 502 on upstream failure (not 500) · voice_calls `recovered_cents` rolls into `totalRealizedCents`.

**P3 Edges (17):** empty/single/100 sets · meritScore boundaries 69/70/100/95-with-false · double-click submit-all · double-submit single · empty-DB stats all zero (no NaN) · stub without URL · 404 on unknown candidate · draftedDisputeText with quotes/newlines/unicode · 1200-char text · cold-start empty-state · `SCRAPER_MODE=cache` keeps $892 math · escalate after approval flips to denied.

**P4 Rehearsal (1):** full demo simulator — `[rehearsal] scan=811ms submit-all=31ms escalate=28ms disputes=30 submitted=22 recoverableCents=89200`.

**P5 Perf (5):**

```
[perf] /api/scan (cache mode) = 806ms                  (budget 5000ms ✅)
[perf] /api/disputes/submit-all (22 disputes) = 28ms   (budget 5000ms ✅)
[perf] mock classifyMany(30) = 0ms                     (budget 500ms ✅)
[perf] mock listOpenDisputes(0ms-latency) = 1ms        (budget 50ms  ✅)
```

Plus a source-scan assertion that the `DollarCounter` tween duration is still `1.4s`.

---

## 3. Tests that failed

**None in the final state.** Confirmation-bias check was performed by intentionally breaking one `recoverableCents` value; the classifier's `$892` guardrail fired correctly (`mock-classifier demo-number drift: expected $892 (89200c) of recoverable on high-merit disputes, got $848.00 (84810c)`), then was reverted to green.

### Intermediate failures encountered and fixed during the pass

1. `getDb is not a function` — I initially imported `getDb` from `@/lib/repo`, but it's in `@/lib/db`. Fixed by correcting the import.
2. Voice webhook ElevenLabs SDK threw `Webhook secret not configured` in rehearsal — replaced `vi.mock` attempt with computing a real HMAC-SHA256 signature matching the SDK's Web Crypto implementation.
3. The above revealed the `await` bug on `constructEvent` (now fix #1 in section 1).

---

## 4. Brittle but passing

| Area | Brittleness |
|---|---|
| **Rehearsal simulator** | Uses a real HMAC signature computed in-test. If ElevenLabs ever changes the signature scheme (e.g., adds a version prefix other than `v0=`), this test would break even though the production code still works. Accepted because it also guards against *us* changing the verification code and drifting from the spec. |
| **Dollar-counter tween assertion** | Reads the source file and asserts the literal `1.4` duration via regex. Cosmetic but if someone tweaks the animation, the test fails until the regex is updated. |
| **P3.3 double-submit idempotency** | Relies on SQLite `ON CONFLICT(candidate_id) DO UPDATE` in `repo.ts`. If the schema ever drops that constraint, the test still passes (because it only asserts totals don't grow) but we'd lose the actual guarantee. |
| **`apps/web/lib/db.ts` schema-path resolution** | Uses `path.join(process.cwd(), "..", "..", "packages/types/schema.sql")`. Correct for `next dev` and `tsx scripts/...` from `apps/web/`; would break if someone runs from the repo root. The voice service uses `__dirname`-relative path which is more robust. |
| **ElevenLabs outbound-call fetch mock in rehearsal** | Intercepts `globalThis.fetch` for URLs containing `api.elevenlabs.io/v1/convai/twilio/outbound-call`. If the SDK ever changes the URL or starts using a different HTTP client, the mock silently stops intercepting → the test would try a real call (which would fail, but not obviously). |
| **`.env.local` secrets coupled to running `tsx --env-file=.env.local`** | The voice server's scripts pass `--env-file=.env.local`, but this means CI or any test runner that doesn't set the flag would run without those values. Tests avoid this by explicitly setting `DB_PATH` and `ELEVENLABS_WEBHOOK_SECRET`. |
| **`apps/voice/test/smoke.test.ts` seeds a `disp_smoke_test` candidate** | The voice webhook's INSERT hits the FOREIGN KEY constraint if the `candidate_id` from `dynamic_variables.case_id` doesn't exist in `dispute_candidates`. In the demo this is fine (seed creates all 30), but a support call with a novel ID would silently fail. See section 6 / 7 for follow-up. |

---

## 5. Manual verification checklist (things tests can't cover)

Before demo time, a human must walk through these:

- [ ] Run `pnpm seed && pnpm dev:web` and `pnpm dev:voice`, open `http://localhost:3000/dashboard` — confirm 30 rows render, dollar counter animates to **$892**.
- [ ] Click **Scan portal** — counter drops to 0 then tweens back to $892 after submit-all.
- [ ] Click **Submit all** — counter smooth animation, no layout shift.
- [ ] Navigate `/mock-portal/disputes` — 30 rows render, table looks DoorDash-ish.
- [ ] Navigate `/trust` — Vanta trust-center page renders cleanly.
- [ ] Start ngrok (`ngrok http 4000`). Confirm `curl $NGROK_URL/health` returns the expected JSON.
- [ ] Set `VOICE_ESCALATE_URL=$NGROK_URL/calls/outbound` and `DOORDASH_SUPPORT_NUMBER=+1XXXXXXXXXX` in `apps/web/.env.local`, restart `pnpm dev:web`. Click a denied dispute's **Call platform** button → teammate's phone rings.
- [ ] Agent opens with *"Hi, this is an automated agent calling on behalf of House of Curry. I'd like to discuss dispute case <N> that was denied..."* — confirm `<N>` is the order number derived from `ord_XXXX` (not `disp_0008`).
- [ ] Hang up. Confirm `sqlite3 counter.db "SELECT candidate_id, call_outcome FROM voice_calls ORDER BY started_at DESC LIMIT 1"` shows the new row with `call_outcome` set.
- [ ] Backup MP3 at `apps/voice/public/backup-call.mp3` plays at `{NGROK_URL}/backup-call.html` (the HTML page exists; MP3 needs to be recorded).
- [ ] Full dress rehearsal with timer: target 8–9 minutes, hard cap 10.
- [ ] Upload backup video to Devpost before the deadline (per `docs/RISKS.md`).

---

## 6. Top 5 demo risks, ranked

| # | Risk | Likelihood | Mitigation status |
|---|---|---|---|
| **1** | **Backup `backup-call.mp3` not recorded** — the demo-safety-net for voice call failures. Page exists and references it, but the file isn't committed. | High (if not done before demo) | Manual checklist item above. Non-code. |
| **2** | **Venue wifi drops during the live voice call** — the one live external dep in the demo. | Medium | ngrok + ElevenLabs webhook requires public URL; backup MP3 covers this if recorded. |
| **3** | **`VOICE_ESCALATE_URL` not set in `.env.local` at demo time** — Escalate button falls back to `mode: "stubbed"`. UI still shows reasonable state (tests confirm 200 + full payload in response) but no phone rings. | Medium — easy to forget | Checklist item; env is local-only so it doesn't ship with the repo. |
| **4** | **Someone re-runs `pnpm seed` between rehearsal and live demo and the demo math drifts** — fixtures + mock classifier are runtime-guarded to $892, but operator error (clicking Scan after seed) wipes submissions and drops the counter to $0. | Medium | `resetAllTables()` is explicit in the scan route with `reset: true`. Demo choreography: *never click Scan AFTER submit-all*. Documented above; also tested in P3.3. |
| **5** | **`DB_PATH` mismatch between apps in a fresh environment** — now fixed (both point at repo-root `counter.db`). If anyone introduces another cwd-relative path in a new service, we regress to "two DBs never sharing state". | Low now — was critical before | Bug #3 above is fixed; any regression should be caught by the rehearsal simulator which asserts cross-app DB writes land. |

---

## 7. Recommended next fixes (priority-ordered, larger than a 30-line edit)

### Priority 1 — Replace foreign-key failure with graceful degrade on the webhook

Currently `apps/voice/src/routes/webhooks.ts` catches `SqliteError: FOREIGN KEY constraint failed` in the try/catch and returns 200 with `{status: "logged-as-error"}`. Transcript is silently dropped. The smoke test asserts the happy path (candidate exists) but in production a webhook could fire for a case_id we don't recognise (e.g., an agent the ops team spun up for a non-dispute use case).

**Recommendation:** in `upsertVoiceCall`, if the candidate row doesn't exist, either (a) skip the INSERT and log, or (b) drop the FK constraint in the schema and let voice_calls be standalone rows. Preferred: (b) — remove the `REFERENCES dispute_candidates(id)` from the `voice_calls` table.

### Priority 2 — Actually parse transcripts into `recovered_cents`

The webhook sets `call_outcome` based on `analysis.call_successful` but doesn't populate `recovered_cents`. `apps/voice/CLAUDE.md` Task 5 says *"Optionally: use Claude to parse transcript into callOutcome (recovered / still_denied / callback_requested)"*. For the demo the current behaviour is fine (no recovered money from voice is shown), but if a call actually recovers funds, the dashboard will say `$0 realized`.

**Recommendation:** 30–50-line Claude call in the post-call handler that extracts a boolean "did the rep agree to reverse the charge?" + a cents amount.

### Priority 3 — Mock DoorDash portal does not expose the scraping DOM contract

The `/mock-portal/disputes` page (verified by static read at the top of this pass) has a big comment block documenting `data-dispute-id`, `data-order-id`, etc. A real test that boots the Next.js server, fetches the page, and asserts each `<tr>` carries all 7 data attributes — plus a mock-TinyFish goal end-to-end — would protect against silent drift.

This would be a Playwright or `supertest+jsdom` suite, ~50 LOC. Not urgent: the demo doesn't exercise TinyFish live; the portal is a visual prop.

### Priority 4 — Dashboard → Voice contract type

Both sides currently send/receive `{toNumber, candidateId, caseNumber, merchantName, denialReason}` but there's no shared TypeScript interface for that payload. Adding `CallOutboundRequest` to `packages/types` and using it in both `apps/voice/src/routes/calls.ts` and `apps/web/app/api/disputes/[id]/escalate/route.ts` would make future drift a typecheck error instead of a runtime ghost.

### Priority 5 — Live classifier test `live.test.ts` is flaky by design

It hits the real Anthropic API with `disp_0004` and asserts `meritScore >= 70`. Claude can (legitimately) return 65 or 69 on any given run — the model's temperature isn't zero. For a pre-demo rehearsal check, this is useful; for CI it's not. Consider splitting into a separate `test:live` target that's opt-in.

### Priority 6 — Demo script references "case 31188" which isn't in the data

`docs/DEMO_SCRIPT.md` Beat 4 has Ritesh saying *"case 31188 that was denied this morning"* and *"merchant ID 8842"*. Neither appears in the fixture set. In the escalate fix (bug #4) the agent now says the order number derived from `ord_NNNN` — so for `disp_0008` the agent says *"case 4561"*. That's not 31188. Either (a) update the demo script to match the data, or (b) renumber `disp_0008`'s `orderId` to be the number from the script. The escalate route's `caseNumberFromCandidate` makes the latter easy.

---

## 8. How to run everything

```bash
# Typecheck all packages + apps
pnpm -r typecheck

# Full test suite (5 suites, ~15s wall clock)
pnpm test:all

# Just the rehearsal simulator — single pass/fail demo gate
pnpm test:demo

# Live Claude integration (requires ANTHROPIC_API_KEY env)
cd packages/classifier && ANTHROPIC_API_KEY=sk-ant-... tsx test/live.test.ts
```

Fresh-clone sanity:
```bash
rm -rf node_modules && pnpm install --no-frozen-lockfile && pnpm seed && pnpm test:all
```
