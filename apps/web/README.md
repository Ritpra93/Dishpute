# `@counter/web` — Counter dashboard, mock portal, trust, onboarding

Worker 3's deliverable. The Next.js app the user actually sees during the demo.

## What this ships

- `/dashboard` — animated dollar counter, dispute queue with merit badges, scan + submit-all + escalation actions, dispute-detail sheet
- `/mock-portal/disputes` — DoorDash-styled merchant portal hosting 30 House of Curry charges (the scrape target for Worker 1)
- `/trust` — Vanta-style trust center (mocked) for the "we're SOC 2 monitored" beat
- `/onboarding` — 3-step onboarding with Stripe Connect (real if `STRIPE_SECRET_KEY` is set, mocked otherwise)
- `/api/disputes` (GET), `/api/disputes/:id/submit` (POST), `/api/disputes/submit-all` (POST), `/api/disputes/:id/escalate` (POST), `/api/scan` (POST), `/api/stats` (GET), `/api/trust` (GET), `/api/stripe/onboarding` (POST)

Demo headline number is locked at **$892.00** of recoverable on 22 high-merit disputes; runtime guardrail in `lib/mock-classifier.ts` will throw on import if the seed data drifts.

## Quickstart

```bash
pnpm install                  # from repo root
pnpm -F @counter/web seed     # creates apps/web/counter.db
pnpm -F @counter/web dev      # http://localhost:3000
```

Then visit:

- http://localhost:3000 — redirects to `/dashboard`
- http://localhost:3000/mock-portal/disputes — Worker 1 scrape target
- http://localhost:3000/trust
- http://localhost:3000/onboarding

## Demo script alignment

| Beat (from `docs/DEMO_SCRIPT.md`) | What this app does |
| --- | --- |
| Beat 2: open mock portal, point at $1,242 in junk charges | `/mock-portal/disputes` shows 30 rows summing to ~$1,242 |
| Beat 3: open Counter dashboard | `/dashboard` shows pre-seeded state with the same 30 disputes |
| Beat 4: click Scan + Submit-all, watch counter climb to $892 | `POST /api/scan {reset:true}` then `POST /api/disputes/submit-all`; the `<DollarCounter>` motion-tweens 0 → 89,200 cents |
| Beat 5: 3 denials show up, escalate via voice | `outcome.escalateToVoice = true` for `disp_0008`, `disp_0017`, `disp_0023`; "Voice escalation queue" card surfaces them |
| Beat 7: trust center | `/trust` |

## Architecture (apps/web isolated)

```
apps/web/
├── app/
│   ├── dashboard/page.tsx          server component, hydrates DashboardClient
│   ├── mock-portal/disputes/...    scrape target (frozen DOM contract)
│   ├── trust/page.tsx
│   ├── onboarding/                 client form + Stripe Connect
│   └── api/                        7 route handlers
├── components/
│   ├── dashboard/                  DollarCounter, MeritBadge, StatusBadge, DisputeDetailSheet, DashboardClient
│   └── ui/                         vendored shadcn primitives (button, card, badge, table, sheet, progress, input, skeleton, tooltip)
├── lib/
│   ├── types.ts                    INLINED contracts (replace at merge time)
│   ├── fixtures.ts                 INLINED 30 House of Curry disputes
│   ├── mock-classifier.ts          INLINED hand-tuned classifier (with $892 guardrail)
│   ├── mock-scraper.ts             INLINED mock scraper (deterministic outcomes)
│   ├── trust-fixture.ts            INLINED Vanta payload
│   ├── schema.sql                  INLINED SQLite schema
│   ├── db.ts                       better-sqlite3 wrapper
│   ├── repo.ts                     CRUD + computeStats()
│   └── utils.ts                    cn(), formatCents, relativeTime
└── scripts/seed-demo.ts            wipes + reseeds counter.db
```

## Merge plan (Worker 1, 2, 4 land their packages)

This app was built in **isolation mode** — every contract that lives in another worker's package has been inlined under `lib/` with a `MERGE NOTE` at the top. Search the tree for `MERGE NOTE` to find every site to update.

The full merge sequence:

### Step 1 — wire `@counter/types` (Worker 0)

1. Add `"@counter/types": "workspace:*"` to `apps/web/package.json` `dependencies`.
2. Run `pnpm install` from the repo root.
3. Verify `packages/types/src/index.ts` has the same `Platform`, `ErrorChargeType`, `DisputeCandidate`, `ClassifiedDispute`, `SubmissionResult`, `DisputeOutcome`, `VoiceCallRecord`, `MERIT_THRESHOLDS`, `CONTINGENCY_FEE_RATE`, `DEMO_MERCHANT`, `DISPUTE_WINDOW_DAYS` as `apps/web/lib/types.ts`.
4. Replace the body of `apps/web/lib/types.ts` with:
   ```ts
   export * from "@counter/types";
   // Local-only types that the workspace package doesn't own (yet):
   export interface EnrichedDispute extends DisputeCandidate { ... }
   export interface DashboardStats { ... }
   ```
5. Delete the inline `Scraper` and `Classifier` interfaces — re-export them from `@counter/scraper` and `@counter/classifier` instead.
6. Replace `apps/web/lib/schema.sql` reads with `path.join(__dirname, "../../../packages/types/schema.sql")` (or just `import schema from "@counter/types/schema.sql"` if the package config supports it).
7. `pnpm -F @counter/web typecheck` should still pass.

### Step 2 — wire `@counter/scraper` (Worker 1)

1. Add `"@counter/scraper": "workspace:*"` to `apps/web/package.json`.
2. Replace `apps/web/lib/mock-scraper.ts` body with:
   ```ts
   export { createMockScraper, createScraper } from "@counter/scraper";
   ```
3. Update `apps/web/app/api/scan/route.ts` and `app/api/disputes/[id]/submit/route.ts` and `app/api/disputes/submit-all/route.ts` to use `createScraper()` (real TinyFish) gated by an env var like `SCRAPER_MODE=live|cache`. The fallback to `createMockScraper()` should still work for offline demo (kill switch).
4. Confirm Worker 1's mock returns the same outcome distribution as ours (3 denied: `disp_0008`, `disp_0017`, `disp_0023`; 19 pending; 8 approved). If their distribution differs, decide which one wins for the demo and align both.

### Step 3 — wire `@counter/classifier` (Worker 2)

1. Add `"@counter/classifier": "workspace:*"` to `apps/web/package.json`.
2. Replace `apps/web/lib/mock-classifier.ts` body with:
   ```ts
   export { createMockClassifier, createClassifier } from "@counter/classifier";
   ```
3. Confirm their `createMockClassifier()` returns the same 22 / 4 / 4 high-medium-low split AND the same `recoverableCents` totals on the high-merit disputes ($892). If they're using Anthropic for real classification, gate it on `CLASSIFIER_MODE=live|cache`.
4. **The $892 demo headline depends on this. If their numbers differ, hand-tune one mock to match the other before the demo.**

### Step 4 — wire `apps/voice` (Worker 4)

1. The escalation route (`apps/web/app/api/disputes/[id]/escalate/route.ts`) already supports a real upstream — set `VOICE_ESCALATE_URL=http://localhost:3001/api/voice/escalate` in `apps/web/.env.local` and remove the "stubbed" branch (or keep it as a fallback so the demo still works if voice is down).
2. Implement `POST /api/voice/callback` in `apps/web` that accepts `{ candidateId, callOutcome, recoveredCents }` from `apps/voice` and writes a row into the `voice_calls` table. The `computeStats()` SQL already counts `voice_calls.recovered_cents WHERE call_outcome='recovered'` toward `totalRealizedCents`, so the dashboard counter will tick up automatically when the voice agent succeeds.
3. Replace `apps/web/lib/trust-fixture.ts` + `app/api/trust/route.ts` with a proxy to `apps/voice`'s `/api/vanta/trust-center`.

### Step 5 — final integration check

```bash
pnpm install
pnpm -F @counter/web seed
pnpm -F @counter/web typecheck
pnpm -F @counter/web build
pnpm -F @counter/web dev
```

Then in another terminal:

```bash
python3 apps/web/../../path/to/smoke.py   # see scripts/smoke section below
```

## Frozen scrape DOM contract (Worker 1 reads this)

`/mock-portal/disputes` exposes:

- `<table id="disputes-table">`
- one `<tr>` per dispute, each carrying:
  - `data-dispute-id="disp_NNNN"`
  - `data-order-id="ord_NNNN"`
  - `data-charge-cents="<int>"`
  - `data-charge-type="missing_item|wrong_item|cold_food|order_never_arrived|customer_cancel"`
  - `data-items='<JSON array>'`
  - `data-order-ts="<ISO8601>"`
  - `data-charge-ts="<ISO8601>"`
  - `data-portal-url="/mock-portal/disputes/disp_NNNN"`
- `<td class="customer-comment">…</td>`
- action `<button>Dispute charge</button>`

Don't change selectors without coordinating with Worker 1.

## Environment variables

All optional — the app degrades gracefully when any are missing.

| Var | Effect when set | Effect when unset |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Real Stripe Connect onboarding URL | Mock onboarding URL returned by `/api/stripe/onboarding` |
| `NEXT_PUBLIC_APP_URL` | Used for Stripe `refresh_url` / `return_url` | `http://localhost:3000` |
| `VOICE_ESCALATE_URL` | `/api/disputes/:id/escalate` proxies to `apps/voice` | `mode: "stubbed"` response with fake convo / call SIDs |

## Demo kill-switch

If anything blows up live:

1. `pnpm -F @counter/web seed` — restores the canonical demo state in 1 second
2. Don't click Scan — go straight to Submit-all
3. The escalation queue is pre-populated by the seed, so even if `/api/disputes/[id]/escalate` returns `mode: "stubbed"`, the UI renders the right copy

## Files / line counts

```
$ find apps/web -name '*.ts' -o -name '*.tsx' -o -name '*.sql' -o -name '*.css' | xargs wc -l
```

Notable:
- `lib/fixtures.ts` — 30 hand-authored disputes, ~330 LOC
- `lib/mock-classifier.ts` — 30 hand-tuned classifications with $892 guardrail, ~340 LOC
- `components/dashboard/dashboard-client.tsx` — main dashboard UI, ~340 LOC
