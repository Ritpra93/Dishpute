# packages/scraper — TinyFish Browser Automation

> **You are Worker 1.** Read order: `../../CLAUDE.md` → `../../docs/VERIFIED_APIS.md` (TinyFish section — memorize) → `../../docs/INTERFACES.md` → this file.

## What this package is

The browser-automation layer. Uses TinyFish's cloud agents to read dispute queues and submit dispute responses inside the merchant's authenticated session. This is the module that makes Counter's moat real.

## Scope

**You modify:** `packages/scraper/**` only.
**You do not modify:** anything else. If you think you need to change `packages/types/`, stop and ask — Worker 0 (during hours 0–2) or team coordination (after hour 2) owns that.

## Public API (consumed by apps/web)

```typescript
// packages/scraper/src/index.ts

import type { DisputeCandidate, SubmissionResult, ClassifiedDispute } from "@counter/types";

export interface Scraper {
  listOpenDisputes(opts: { merchantId: string; platform: "doordash" }): Promise<DisputeCandidate[]>;
  submitDispute(opts: { candidate: DisputeCandidate; draftedText: string }): Promise<SubmissionResult>;
  scrapeOutcomes(opts: { candidateIds: string[] }): Promise<Array<{ candidateId: string; outcome: "approved" | "denied" | "pending"; refundedCents: number }>>;
}

export function createScraper(opts: { tinyFishApiKey: string }): Scraper;
export function createMockScraper(opts?: { latencyMs?: number }): Scraper;
```

## Task order

### Task 1 — Scaffolding + mock (hour 2–3)

- `package.json` — `name: "@counter/scraper"`, deps: `@counter/types` (workspace), devDeps: `tsx`, `vitest`, `typescript`
- `tsconfig.json` strict
- `src/index.ts` — exports the Scraper interface and factories
- `src/mock.ts` — `createMockScraper` that returns `FIXTURE_DISPUTES` from `@counter/types` with simulated latency (default 1200ms)
- `__fixtures__/doordash-disputes.json` — snapshot of fixtures for non-TypeScript consumers (the Worker 3 mock portal will serve from this file)
- `test/smoke.test.ts` — calls `createMockScraper().listOpenDisputes()` and asserts length 30

Commit: `feat(scraper): scaffold package with mock scraper`

### Task 2 — Real TinyFish client (hour 3–6)

Build `src/tinyfish.ts` EXACTLY per `docs/VERIFIED_APIS.md` — TinyFish section. Do not improvise. Do not use any typed SDK.

```typescript
// Outline — fill in per docs/VERIFIED_APIS.md
type TinyFishEvent = {
  type: string;
  status?: string;
  resultJson?: unknown;
  message?: string;
};

export async function runTinyFish(params: {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: { enabled: boolean; country_code: string };
}): Promise<unknown> {
  // POST https://agent.tinyfish.ai/v1/automation/run-sse
  // Headers: X-API-Key, Content-Type
  // Parse SSE stream (split on \n, filter `data: ` prefix, JSON.parse)
  // Return resultJson from the COMPLETE event
}
```

Verification before coding: quote back to me the exact endpoint URL, the exact header name, and the terminal event's `type` field. If your memory disagrees with `docs/VERIFIED_APIS.md`, the docs win.

### Task 3 — DoorDash-specific scraping (hour 6–8)

`src/doordash.ts` wraps `runTinyFish` with dispute-specific goals targeting **Worker 3's mock portal** at `http://localhost:3000/mock-portal/disputes`.

Coordinate with Worker 3 **before** writing this — you need to agree on the mock portal's DOM structure. Tell Worker 3:
- Which selectors you'll rely on
- What data attributes you need (`data-dispute-id`, `data-charge-cents`, etc.)
- Where the "Submit dispute" button lives and what form fields it exposes

Implement:

```typescript
async function listOpenDisputes(): Promise<DisputeCandidate[]> {
  const goal = `
    Navigate to the disputes table at this URL.
    For each row, extract:
    - dispute_id (from data-dispute-id)
    - order_id (from data-order-id)
    - charge_amount_cents (from data-charge-cents)
    - charge_type (from data-charge-type)
    - items_reported (array from data-items JSON-encoded in the row)
    - customer_comment (text from .customer-comment element)
    - order_timestamp (ISO from data-order-ts)
    - charge_timestamp (ISO from data-charge-ts)
    Return as a JSON array matching the schema:
    [{ id: string, orderId: string, chargeAmountCents: number, ... }]
    Return ONLY the JSON array, no commentary.
  `;
  const raw = await runTinyFish({ url: MOCK_PORTAL_URL, goal, browser_profile: "lite" });
  return normalizeToCanonicalShape(raw);
}
```

Add retry logic:
- If `runTinyFish` throws or returns empty array, retry once with `browser_profile: "stealth"`
- If that also fails and `SCRAPER_MODE === "cache"`, return `FIXTURE_DISPUTES`
- Otherwise throw

### Task 4 — Dispute submission (hour 8–10)

```typescript
async function submitDispute(opts): Promise<SubmissionResult> {
  const goal = `
    Navigate to ${opts.candidate.portalUrl}.
    Find the "Dispute charge" button and click it.
    In the resulting form, paste this text into the "Your response" field:
    ---
    ${opts.draftedText}
    ---
    Click "Submit dispute" and wait for the confirmation screen.
    Extract the confirmation ID (format: CONF-XXXXXX) and return as { confirmationId: string }.
  `;
  const result = await runTinyFish({ url: opts.candidate.portalUrl, goal });
  // Build SubmissionResult from result
}
```

### Task 5 — Outcomes scraping (hour 10–12, descope-candidate)

Scrape dispute outcome statuses on-demand. This can be mocked for the demo (seed DB with outcomes manually). Real implementation only if Tasks 1–4 done early.

### Task 6 — Integration support (hour 12+)

Expose `SCRAPER_MODE=cache` env flag in `createScraper`: if set, all methods return fixture data with realistic latency instead of hitting TinyFish. This is the demo kill-switch.

## Verified TinyFish facts (quote back before coding)

From `docs/VERIFIED_APIS.md`:

- Endpoint: `POST https://agent.tinyfish.ai/v1/automation/run-sse`
- Auth header: `X-API-Key: <key>` — NOT `Authorization: Bearer`
- Request body requires `url` and `goal` — both natural language
- Response is an SSE stream — parse `data: {...}` lines as JSON
- Terminal event: `type: "COMPLETE"` with `status: "COMPLETED"` and `resultJson`
- No typed SDK exists. Do not import any `@tinyfish/*` or `tinyfish-js` package.

If Claude Code tries to invent a method like `tinyfishClient.runTask()`, stop and redirect.

## Exit criteria

- `pnpm -F @counter/scraper build` green
- `pnpm -F @counter/scraper test` green (smoke test)
- Real TinyFish call against Worker 3's mock portal returns 30 realistic `DisputeCandidate` records
- `SCRAPER_MODE=cache` returns fixtures without touching TinyFish
- Handoff confirmed with Worker 3: mock portal DOM matches your selectors

## Rules

1. **No typed SDK.** TinyFish is fetch + SSE. Don't let Claude Code invent an SDK.
2. **Verify API facts against `docs/VERIFIED_APIS.md` before writing call code.**
3. **Coordinate mock portal DOM with Worker 3 BEFORE writing scrapers.** 10 minutes in Slack saves 2 hours.
4. **`SCRAPER_MODE=cache` must work.** This is the demo kill-switch.
5. **Imports from `@counter/types` only.** Never redeclare a `DisputeCandidate` locally.
6. **No other file modifications.** If you need a type change, ask.
