# apps/web — Dashboard + Mock Portal

> **You are Worker 3 (Ritesh).** Read order: `../../CLAUDE.md` → `../../docs/VERIFIED_APIS.md` (frontend stack section — memorize) → `../../docs/INTERFACES.md` → `../../docs/DEMO_SCRIPT.md` → this file.

## What this app is

Two surfaces in one Next.js app:

1. **Counter dashboard** (`/dashboard`) — what the merchant sees. Live dispute queue, dollar counter, submit-all button, escalate button. This is what judges watch for 8 of the 10 demo minutes.
2. **Mock DoorDash portal** (`/mock-portal/disputes`) — what Worker 1's scraper targets. Looks and feels like a real merchant portal. Renders Worker 1's fixture data via the DOM attributes Worker 1 needs for scraping.

Plus:
- `/trust` — the mocked Vanta trust center page (pulls from Worker 4's `/api/vanta/trust-center` endpoint)
- `/onboarding` — Stripe Connect Express onboarding flow
- `/api/*` — REST routes per `docs/INTERFACES.md`

## Scope

**You modify:** `apps/web/**` only.
**You do not modify:** anything else.

## Design philosophy

**Linear or Stripe, NOT Duolingo.**

- Neutral, confident, quiet. No gradients, no glitter, no emojis.
- Small type, generous whitespace, single accent color (green for "recovered money").
- Animation is for reinforcing state changes (dispute submitted, dollars incrementing), not for decoration.
- Zero marketing copy. This looks like a piece of back-office software that a serious restaurant operator would use.
- Dense where dense is useful (the queue table). Airy where airiness is useful (the stats header).

The demo lives or dies on this feeling "quietly confident." If it feels "flashy" we've lost the Series A judges.

## Task order

### Task 1 — Scaffold (hour 2–3, ~45 min)

Before any code, quote back to me from `docs/VERIFIED_APIS.md`:
- Next.js version
- Animation library package name
- shadcn CLI package name
- `next.config.ts` flag required for better-sqlite3
- Node version

Then scaffold:

```bash
# From apps/web (don't create a subfolder)
npx create-next-app@latest . --ts --tailwind --app --turbopack --eslint --src-dir=false --import-alias="@/*" --yes
npx shadcn@latest init -y
npx shadcn@latest add button card dialog input table badge progress skeleton sheet tooltip
npm install motion better-sqlite3
npm install -D @types/better-sqlite3 tsx
```

Edit `next.config.ts` to add:
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3'],
};
```

Install workspace packages in `package.json`:
```json
"dependencies": {
  "@counter/types": "workspace:*",
  "@counter/scraper": "workspace:*",
  "@counter/classifier": "workspace:*"
}
```

Commit: `feat(web): scaffold Next.js 16 + shadcn + motion + better-sqlite3`

### Task 2 — Database + seed script (hour 3–4)

`lib/db.ts`:
```typescript
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "counter.db");
let db: Database.Database;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    const schema = fs.readFileSync(
      path.join(process.cwd(), "../../packages/types/schema.sql"),
      "utf-8"
    );
    db.exec(schema);
  }
  return db;
}
```

`scripts/seed-demo.ts`:
- Imports `FIXTURE_DISPUTES` from `@counter/types`
- Imports `createMockClassifier` from `@counter/classifier`
- Inserts 30 candidates, 30 classifications
- For 3 of them, inserts outcomes (`outcome: 'denied'`, `escalate_to_voice: 1`)
- For 19 of them, inserts outcomes (`outcome: 'pending'`) — those will "resolve" during the demo
- For the rest, inserts no outcome yet

Run: `pnpm tsx scripts/seed-demo.ts`. The DB is now demo-ready.

Package script: `"seed": "tsx scripts/seed-demo.ts"`

### Task 3 — Mock DoorDash portal (hour 4–6)

**Coordinate with Worker 1 before writing this.** Agree on DOM structure. Suggested contract:

```html
<table id="disputes-table">
  <tr data-dispute-id="disp_0001"
      data-order-id="ord_4472"
      data-charge-cents="4780"
      data-charge-type="missing_item"
      data-items='[{"name":"Masala Dosa","quantity":2,"refundAmountCents":2400}]'
      data-order-ts="2026-04-15T19:28:00-05:00"
      data-charge-ts="2026-04-15T20:11:00-05:00">
    <td>4472</td>
    <td>Masala Dosa ×2</td>
    <td>$47.80</td>
    <td class="customer-comment">Customer reports one dosa missing from order.</td>
    <td><button>Dispute charge</button></td>
  </tr>
  ...
</table>
```

Pages:
- `app/mock-portal/layout.tsx` — styled to look like a DoorDash merchant portal (red header, sidebar nav "Orders / Disputes / Analytics")
- `app/mock-portal/disputes/page.tsx` — server component, reads `FIXTURE_DISPUTES` from `@counter/types`, renders the table with data attributes

This is a visual prop. It doesn't need to be interactive. It needs to look real and expose the data Worker 1 scrapes.

### Task 4 — Dashboard shell with mocks (hour 4–6)

`app/dashboard/page.tsx` — client component, wired to `/api/disputes` + `/api/stats`.

Components:
- `components/dollar-counter.tsx` — animated counter using `motion`. Smooth tick from 0 to total recoverable.
- `components/dispute-queue.tsx` — table, rows color-coded by merit score
- `components/scan-progress.tsx` — progress bar for `/api/scan`
- `components/dispute-detail.tsx` — sheet/drawer opening on row click, shows reasoning + drafted text + evidence citations
- `components/escalate-button.tsx` — button on denied disputes, POSTs to `/api/disputes/[id]/escalate`
- `components/activity-log.tsx` — recent-events feed

Use `createMockScraper` and `createMockClassifier` initially. Swap to real once Workers 1 and 2 ship.

### Task 5 — API routes (hour 6–8)

All per `docs/INTERFACES.md`:
- `app/api/disputes/route.ts` — GET, returns enriched disputes
- `app/api/scan/route.ts` — POST, triggers scrape + classify
- `app/api/disputes/[id]/submit/route.ts` — POST
- `app/api/disputes/submit-all/route.ts` — POST
- `app/api/disputes/[id]/escalate/route.ts` — POST, forwards to `apps/voice`'s `/calls/outbound`
- `app/api/stats/route.ts` — GET, computes totals from DB
- `app/api/trust/route.ts` — GET, proxies Worker 4's `/api/vanta/trust-center`

Each route:
- Imports from `@counter/scraper` and `@counter/classifier`
- Reads/writes via `lib/db.ts`
- Returns typed responses (re-use `@counter/types` shapes)

### Task 6 — Dollar counter + polish (hour 12–16)

The hero animation. **This is where the demo is won.**

```typescript
// components/dollar-counter.tsx
"use client";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect } from "react";

export function DollarCounter({ cents }: { cents: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `$${(v / 100).toFixed(0)}`);

  useEffect(() => {
    const controls = animate(count, cents, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],  // easeOutExpo
    });
    return controls.stop;
  }, [cents, count]);

  return <motion.span className="text-6xl font-semibold tabular-nums">{rounded}</motion.span>;
}
```

Plus: row stagger-in when new classifications complete, subtle success pulse on submit, red DENIED state for escalation.

Do NOT over-animate. Single animations, not cascades.

### Task 7 — Trust page + Stripe onboarding (hour 16–18)

- `app/trust/page.tsx` — fetches `/api/trust`, renders controls/frameworks/integrations in a clean trust-center layout
- `app/onboarding/page.tsx` — button → `/api/stripe/onboarding` → redirect to Stripe-hosted onboarding with magic test tokens
- `app/api/stripe/onboarding/route.ts` — creates Connect account, returns onboarding URL

### Task 8 — Integration + rehearsal support (hour 18+)

- Ensure the full flow works end-to-end (scan → classify → submit → escalate)
- Run `scripts/seed-demo.ts` before every rehearsal to reset state
- Test with `SCRAPER_MODE=cache` set — demo kill-switch
- Record the demo video via OBS for Devpost backup submission

## Verified frontend stack facts (quote back before coding)

From `docs/VERIFIED_APIS.md`:
- Next.js **16.2.x** (NOT 15)
- Animation library: `motion` (NOT `framer-motion`)
- shadcn CLI: `shadcn` (NOT `shadcn-ui`)
- `next.config.ts` must include `serverExternalPackages: ['better-sqlite3']`
- Node 24 LTS
- Tailwind v4 (default in Next.js 16)

## Exit criteria

- Dashboard renders at `/dashboard` with real data from SQLite
- Mock portal renders at `/mock-portal/disputes` with 30 fixture disputes
- `POST /api/scan` kicks off a real scrape → classify → DB write pipeline
- `POST /api/disputes/submit-all` submits 22 disputes in under 90 seconds
- Dollar counter animates smoothly from 0 to $892
- Escalate button fires a real call via Worker 4's service
- `pnpm dev` in this directory boots the full app

## Local dev gotchas — voice escalation runbook

`POST /api/disputes/[id]/escalate` is wired to forward to apps/voice when
`VOICE_ESCALATE_URL` is set; otherwise it stays in safe "stubbed" mode (no
real phone call, but the UI still flips the dispute to `escalateToVoice=true`).

To make the dashboard's **"Call platform"** button trigger a real outbound
call, run **3 shells** in this order:

```bash
# Shell 1 — public tunnel for ElevenLabs webhooks (tools + post-call)
ngrok http 4000
# copy the https forwarding URL into .env.local as NGROK_PUBLIC_URL

# Shell 2 — voice service (reads ELEVENLABS_API_KEY/AGENT_ID/PHONE_NUMBER_ID)
pnpm -F @counter/voice dev

# Shell 3 — dashboard (must export VOICE_ESCALATE_URL + DOORDASH_SUPPORT_NUMBER)
VOICE_ESCALATE_URL=http://localhost:4000/calls/outbound \
DOORDASH_SUPPORT_NUMBER=+15551234567 \
  pnpm dev:web
```

Click "Call platform" on a denied dispute. The escalate response shape is:

- `mode: "live"` + `conversationId` + `callSid` → real call placed (banner: green check)
- `mode: "stubbed"` → `VOICE_ESCALATE_URL` not set (banner: gray info)
- `code: "voice_unreachable"` (502) → apps/voice not running (banner: red, hint to run shell 2)
- `code: "voice_upstream_error"` (502) → apps/voice returned non-2xx — check its logs for the ElevenLabs error

The route never echoes upstream response bodies to the client — check
`apps/voice` server logs (Shell 2) for the underlying ElevenLabs error.

## Rules

1. **`apps/web/` only.**
2. **Import from `@counter/*` workspace packages.** Never redeclare types.
3. **`use client` only where actually needed** (interactive components). Server components for everything else.
4. **No `localStorage`, no `sessionStorage`.** Not needed and not supported in some rendering paths.
5. **`motion` imports:** `import { motion } from "motion/react"`.
6. **shadcn components go in `components/ui/`.** Other components in `components/`.
7. **Design discipline:** if you catch yourself adding gradients, emojis, or multi-color backgrounds, undo it. Linear/Stripe aesthetic.
8. **Coordinate mock portal DOM with Worker 1 before writing the `/mock-portal` page.**
