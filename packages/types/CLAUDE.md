# packages/types — Shared Contracts

> **Read order:** `../../CLAUDE.md` → `../../docs/VERIFIED_APIS.md` → `../../docs/INTERFACES.md` → this file.

## What this package is

The single source of truth for every data shape that crosses module boundaries in Counter. Every other package and app imports from here. If two modules disagree on a shape, one of them has stopped importing from `@counter/types` and needs to be fixed.

## Ownership

This package is owned by **whoever drives hours 0–2**, then **frozen**. After hour 2, changes to this package require explicit acknowledgement in team chat from every worker consuming the affected type.

## Scope

**You modify:** `packages/types/**` only.
**You do not modify:** anything else in the repo.

## What to build

### Task 1 — Package setup (hour 0, ~15 min)

Files to create:
- `package.json` — `name: "@counter/types"`, `main: "./dist/index.js"`, `types: "./dist/index.d.ts"`, build script `tsc -p .`
- `tsconfig.json` — strict mode, ES2022 target, `outDir: "./dist"`, `declaration: true`
- `src/index.ts` — will hold all exports
- `src/constants.ts`
- `src/fixtures.ts`
- `schema.sql`

Gate: `pnpm -F @counter/types build` produces `dist/` with `.d.ts` files. Other workspaces can `import { DisputeCandidate } from "@counter/types"` and TypeScript is happy.

### Task 2 — Types (hour 0–1, ~45 min)

Copy every type from `../../docs/INTERFACES.md` verbatim into `src/index.ts`:
- `Platform`, `ErrorChargeType`
- `DisputeCandidate`
- `ClassifiedDispute`
- `SubmissionResult`
- `DisputeOutcome`
- `VoiceCallRecord`

Rules:
- No `any` types anywhere
- No optional fields unless the interface explicitly marks them optional
- Add JSDoc comments above each interface summarizing ownership and consumers (copy from INTERFACES.md)
- Export every type

### Task 3 — Constants (hour 1, ~20 min)

`src/constants.ts`:

```typescript
/** Disputes must be filed within this window of the charge timestamp. */
export const DISPUTE_WINDOW_DAYS = 14;

/** Merit-score thresholds used across modules. */
export const MERIT_THRESHOLDS = {
  /** Submit automatically without human review. */
  AUTO_SUBMIT: 70,
  /** Queue for human review; do not auto-submit. */
  HUMAN_REVIEW: 40,
  /** Do not dispute — platform is likely correct. */
  SKIP: 0,
} as const;

/** Contingency fee as a decimal (20%). */
export const CONTINGENCY_FEE_RATE = 0.2;

/** Only escalate denials with at least this merit score. */
export const VOICE_ESCALATION_MIN_MERIT = 70;

/** Dispute submission concurrency when batching. */
export const SUBMIT_CONCURRENCY = 5;

/** Classifier concurrency when batching. */
export const CLASSIFIER_CONCURRENCY = 10;
```

### Task 4 — Fixtures (hour 1–2, ~45 min)

`src/fixtures.ts` — 30 realistic `DisputeCandidate` objects for **House of Curry** (South Indian restaurant, 3 Minneapolis locations).

Requirements:
- Variety: 15 `missing_item`, 6 `wrong_item`, 4 `cold_food`, 3 `order_never_arrived`, 2 `customer_cancel`
- Amounts: mix $8–$85, mostly $15–$45
- Realistic South Indian menu items in `itemsReported`: dosa, idli, sambar, biryani, gulab jamun, vada, uttapam, chai, etc.
- Customer comments: ~40% populated, mix of legitimate-sounding ("missing one dosa — got 2 when I ordered 3") and suspect ("order was cold and old I want full refund")
- Timestamps spread across the last 14 days, a few near the deadline
- `rawText` includes full scraped text — complete customer comment + order summary line + any platform-auto-applied flags

Export:
- `FIXTURE_DISPUTES: DisputeCandidate[]` — the 30 records
- `DEMO_MERCHANT` — `{ id: "merchant_hoc", name: "House of Curry", locations: 3, city: "Minneapolis" }`

### Task 5 — Schema (hour 2, ~15 min)

`schema.sql` — copy verbatim from `../../docs/INTERFACES.md` "Database schema" section.

Consumed by `apps/web/lib/db.ts` at startup to initialize SQLite.

## Exit criteria

- `pnpm -F @counter/types build` green
- `pnpm -F @counter/types typecheck` green
- File `dist/index.d.ts` contains every interface from `docs/INTERFACES.md`
- Worker 1, 2, 3, 4 can `import { DisputeCandidate, FIXTURE_DISPUTES } from "@counter/types"` and it resolves
- Commit: `feat(types): initial shared contracts, constants, fixtures, schema`

## Rules

1. **No behavior.** Types, constants, fixtures, schema. No functions (other than fixture factories), no classes, no I/O.
2. **Frozen after hour 2.** If a consumer needs a new field, they ask in team chat; if approved, one person adds it; all consumers bump their dependency on the same commit.
3. **Backwards-compatible additions only.** Never remove or rename a field after hour 2. Deprecate with a comment, add a new field.
4. **Fixtures are stable.** Worker 2's classifier and Worker 3's dashboard rely on specific `id` values. Don't shuffle or renumber.
