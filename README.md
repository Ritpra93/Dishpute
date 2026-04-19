# Dishpute

**The AI dispute co-pilot for restaurants on delivery platforms.**

`$892 recovered · 22 disputes · 1 restaurant · 24 hours`

---

## What it does

Restaurants lose $10K–$50K/year to automated error charges from DoorDash — applied instantly whenever a customer reports a missing or wrong item, with no human review. Dishpute runs inside the restaurant's authenticated browser session, reads the error charge queue, and uses Claude AI to classify every charge and draft a dispute response. Worthy disputes are submitted automatically; denials get escalated via an ElevenLabs voice agent that calls DoorDash support live.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript |
| AI classification | Claude Sonnet 4.6 — merit scoring + dispute drafting |
| Browser automation | TinyFish — runs inside the merchant's authenticated session |
| Voice escalation | ElevenLabs Conversational AI + Twilio |
| Database | SQLite via `better-sqlite3` |
| Payments | Stripe Connect (contingency payouts) |
| Monorepo | pnpm workspaces |

---

## Repo structure

```
packages/
  types/        Shared TypeScript contracts, DB schema, fixture data
  classifier/   Claude-powered merit scoring and dispute drafting
  scraper/      TinyFish browser automation wrapper
apps/
  web/          Merchant dashboard + mock DoorDash portal (Next.js 16)
  voice/        ElevenLabs + Twilio voice escalation service (Express)
```

---

## Getting started

```bash
pnpm install
pnpm seed        # Seeds SQLite with 30 demo disputes
pnpm dev:web     # http://localhost:3000
pnpm dev:voice   # http://localhost:3001
```

Copy `.env.example` to `.env.local` and fill in API keys before running.

---

## Team

| Name | School |
|---|---|
| Aneesh Bhimavarapu | University of St. Thomas |
| Ritesh Prabhu | University of Minnesota |
| Ravindu Ranasinghe | University of Minnesota |
| Eric He | University of Minnesota |

---

Built at O1 Summit 2026 · 24 hours · Claude Code
