# Verified APIs (April 2026)

> **For Claude Code:** This is the source of truth. When writing code that calls TinyFish, ElevenLabs, Anthropic, or the frontend stack, reference this document — not training data. Every URL, parameter name, and code snippet below has been verified against live documentation.
>
> If this document contradicts your memory of the API, this document wins. If you need something not documented here, fetch the live docs and add a section before coding.

---

## TinyFish — browser automation

**Signup:** https://agent.tinyfish.ai/sign-in → API keys at `/api-keys` → 500 free credits, no card required.

### The core endpoint (synchronous SSE stream)

```
POST https://agent.tinyfish.ai/v1/automation/run-sse
Headers:
  X-API-Key: <key>        ← NOT "Bearer <key>"
  Content-Type: application/json
Body:
  {
    "url": "https://example.com",
    "goal": "Natural-language task description. Include schema for return data.",
    "browser_profile": "stealth" | "lite",   // optional; stealth handles Cloudflare/PerimeterX
    "proxy_config": { "enabled": true, "country_code": "US" }  // optional
  }
```

Also available: `POST /run` (synchronous, no SSE), `POST /run-async` (returns `run_id`, poll `GET /runs/:id`).

### Response: SSE stream of `data: {...}` events

Each event has a `type` field. The terminal event has `type === "COMPLETE"` and `status === "COMPLETED"`, with extracted data in `result`. On failure, `status === "FAILED"`.

**Correction (verified live 2026-04-18):** the docs say `resultJson` but the actual API returns the field as `result`. Use `result`.

**Trap:** a run can have `status: COMPLETED` (browser finished) but `resultJson.status: "failure"` (goal failed). Check both.

### Canonical TypeScript client

```typescript
// packages/scraper/src/tinyfish.ts
type TinyFishEvent = {
  type: string;
  status?: string;
  run_id?: string;
  streaming_url?: string;
  result?: unknown;   // NOTE: API uses `result`, not `resultJson`
  message?: string;
};

export async function runTinyFish(params: {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: { enabled: boolean; country_code: string };
}): Promise<unknown> {
  const res = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
    method: "POST",
    headers: {
      "X-API-Key": process.env.TINYFISH_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    throw new Error(`TinyFish ${res.status}: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const evt: TinyFishEvent = JSON.parse(line.slice(6));
      if (evt.type === "COMPLETE" && evt.status === "COMPLETED") {
        return evt.result;
      }
      if (evt.status === "FAILED") {
        throw new Error(`TinyFish run failed: ${JSON.stringify(evt)}`);
      }
    }
  }

  throw new Error("TinyFish stream ended without COMPLETE event");
}
```

### Authentication to target sites

Simplest approach (what cookbooks use): **put credentials in the goal string.**

```typescript
await runTinyFish({
  url: "https://portal.example.com/login",
  goal: `Log in with email "${email}" and password "${password}".
Then navigate to /disputes. Extract the disputes table as JSON:
[{ dispute_id: string, order_id: string, amount_cents: int, charge_type: string }]
Return ONLY the JSON array.`,
  browser_profile: "stealth",
});
```

**Caveat:** this sends creds in plaintext to TinyFish and logs them in the run trace. Fine for a hackathon demo against a mock portal. For production use TinyFish's Vault & Credentials feature (exact API not in public docs — ask in their Discord).

### Gotchas

- No typed SDK — it's fetch + SSE. That's by design.
- `X-API-Key` header, NOT `Authorization: Bearer`
- Free tier: 500 credits, ~25 full workflow runs. A poorly-scoped goal burns credits fast — make goals specific.
- CAPTCHA: handles Cloudflare/PerimeterX; does NOT solve DataDome or hCaptcha.
- Rate limits on free tier aren't published. For a 30-dispute hackathon demo, you're fine.

### Optional: TinyFish MCP for Claude Code dev loop

If you want Claude Code itself to use TinyFish while you develop (e.g., "ask TinyFish to check what's on the mock portal right now"):

```bash
claude mcp add --transport http tinyfish https://agent.tinyfish.ai/mcp
```

Or in `.mcp.json`:
```json
{ "mcpServers": { "tinyfish": { "url": "https://agent.tinyfish.ai/mcp" } } }
```

Auth is OAuth 2.1 (browser-based). Skippable for the hackathon — use TinyFish at runtime only.

**Sources:** https://docs.tinyfish.ai, https://docs.tinyfish.ai/mcp-integration, https://docs.tinyfish.ai/faq

---

## ElevenLabs Conversational AI ("ElevenAgents")

**Signup:** https://elevenlabs.io → API keys in profile. Conversational AI now rebranded "ElevenAgents" or "Agents Platform." Doc URLs live at `/docs/agents-platform/*` and `/docs/eleven-agents/*`.

### Outbound call — the one endpoint that matters

```
POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
Headers:
  xi-api-key: <key>
  Content-Type: application/json
Body:
  {
    "agent_id": "...",
    "agent_phone_number_id": "...",
    "to_number": "+15551234567",
    "conversation_initiation_client_data": {
      "dynamic_variables": {
        "case_number": "31188",
        "merchant_name": "House of Curry",
        "denial_reason": "..."
      }
    },
    "call_recording_enabled": true
  }
```

**Path note:** the canonical form is `outbound-call` (hyphen). Some older doc snippets show `outbound_call` (underscore) — that's wrong.

Response:
```json
{ "success": true, "conversation_id": "...", "callSid": "..." }
```

Note mixed casing — `callSid` is camelCase, everything else is snake_case. Don't normalize it incorrectly.

### Setup flow (dashboard, done once in PRE_HACKATHON.md)

1. ElevenLabs → ElevenAgents → Agents → Create. System prompt + voice + tools configured here.
2. ElevenLabs → ElevenAgents → Phone Numbers → Import. Paste Twilio Account SID + Auth Token + phone number. ElevenLabs auto-wires Twilio's Voice webhook. **Save the Phone Number ID.**
3. Test with the dashboard's "Call agent" button before anything else.

### Agent settings that matter

- **Voice model:** Eleven Flash v2.5 (explicitly recommended for Agents; ~75ms model latency). **Do NOT use v3** — alpha, not real-time.
- **Turn-taking:** set eagerness to `normal`; user-input timeout 5–10s for chat, 10–30s for tech support; enable barge-in.
- **Language:** `en` for the demo.

### Function-calling tools

Defined in the agent config (dashboard or API). For the demo, 3 tools:

```json
{
  "type": "webhook",
  "name": "lookup_dispute_case",
  "description": "Look up the full details of a dispute case by case number.",
  "api_schema": {
    "url": "https://<ngrok-tunnel>/tools/lookup_case",
    "method": "POST",
    "request_body_schema": {
      "type": "object",
      "properties": { "caseId": { "type": "string" } },
      "required": ["caseId"]
    }
  }
}
```

Tools live in `conversation_config.agent.prompt.tools[]`. Four types exist: `webhook`, `client`, `mcp`, `system`.

### Dynamic variables (how the agent gets case-specific context)

Syntax in prompts: `{{case_number}}`, `{{merchant_name}}`. Pass at call init via `dynamic_variables` (see request body above). Types: string, number, boolean.

**Security gotcha:** prompt/voice overrides (via `conversation_config_override`) must be explicitly allowed per-agent in the **Security tab** before they work.

### Post-call webhook

Configured at **ElevenAgents → Settings → Webhooks**.

Payload (simplified):
```json
{
  "type": "post_call_transcription",
  "event_timestamp": 1739537297,
  "data": {
    "conversation_id": "...",
    "agent_id": "...",
    "status": "done",
    "transcript": [
      { "role": "agent"|"user", "message": "...", "time_in_call_secs": 0 }
    ],
    "metadata": { "call_duration_secs": 45, "termination_reason": "..." },
    "analysis": { "call_successful": "success"|"failure"|"unknown", "transcript_summary": "..." },
    "conversation_initiation_client_data": {
      "dynamic_variables": { "case_number": "31188" }
    }
  }
}
```

**Signature verification** (required for security):
```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

app.post("/webhooks/elevenlabs/post-call",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.header("ElevenLabs-Signature")!;
    const event = client.webhooks.constructEvent(
      req.body.toString("utf-8"),
      sig,
      process.env.ELEVENLABS_WEBHOOK_SECRET!
    );
    if (event.type === "post_call_transcription") {
      // persist event.data.transcript, event.data.analysis, etc.
    }
    res.status(200).json({ status: "ok" });
  }
);
```

**Do not use a standard JSON body parser for this route.** Use `express.raw()` so signature verification has the exact bytes.

### Gotchas

- Total turn latency typically 1–2s (TTS <200ms, but LLM adds 350–1000ms)
- Webhook disabled after 10 consecutive failures or 7 days no success
- 4xx is NOT retried (unlike 5xx); HIPAA accounts get zero retries either way
- Webhook IPs for firewall allowlisting: US default `34.67.146.145`, `34.59.11.47`

**Sources:** https://elevenlabs.io/docs/api-reference/twilio/outbound-call, https://elevenlabs.io/docs/agents-platform/workflows/post-call-webhooks, https://elevenlabs.io/docs/agents-platform/customization/personalization/dynamic-variables

---

## Anthropic SDK — Claude Sonnet 4.6 + Haiku 4.5

**Models (verified current as of April 2026):**
- `claude-sonnet-4-6` — primary classifier. $3/$15 per MTok. 1M context. **This is the current Sonnet. There is no Sonnet 4.7.**
- `claude-haiku-4-5` — cheap pre-filter + simple classifications. $1/$5 per MTok.
- `claude-opus-4-7` — flagship, released April 16, 2026. $5/$25. **Do not use for this project** (cost, no quality gap for our task).

### The NEW structured-outputs API (preferred over forced tool use)

Went GA early 2026. Use this for the classifier instead of the old `tool_choice: {type: "tool"}` hack.

```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();  // reads ANTHROPIC_API_KEY from env

const response = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2048,
  output_config: {
    format: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          shouldDispute: { type: "boolean" },
          meritScore: { type: "integer", minimum: 0, maximum: 100 },
          reasoning: { type: "string" },
          resolvedChargeType: {
            type: "string",
            enum: ["missing_item", "wrong_item", "order_never_arrived", "cold_food", "customer_cancel", "unknown"]
          },
          recoverableCents: { type: "integer" },
          draftedDisputeText: { type: "string" },
          evidenceCitations: { type: "array", items: { type: "string" } }
        },
        required: ["shouldDispute", "meritScore", "reasoning", "resolvedChargeType", "recoverableCents", "draftedDisputeText", "evidenceCitations"],
        additionalProperties: false
      }
    }
  },
  system: [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }  // ← caches the system prompt
    }
  ],
  messages: [{ role: "user", content: candidateJson }]
});

// response.content[0].text is guaranteed valid JSON per your schema
const result = JSON.parse(
  response.content.find((b) => b.type === "text")!.text
) as ClassifiedDispute;
```

### Prompt caching

Add `cache_control: { type: "ephemeral" }` to any block you want cached. Default TTL 5 min; add `ttl: "1h"` for long-lived prompts.

- Cache writes cost **1.25× (5m)** or **2× (1h)** of normal input tokens.
- **Cache reads cost 0.1× and don't count toward ITPM rate limits** — this is effectively a 5–10× throughput multiplier.
- Minimum cacheable prefix: 1024 tokens for Sonnet, 4096 for Haiku.

For Counter: cache the system prompt (long, stable) + tool/schema definitions. Don't cache the per-candidate user message.

### Haiku routing for cheap classifications

Not every dispute needs Sonnet. Pattern:

```typescript
// packages/classifier/src/index.ts
async function classify(candidate: DisputeCandidate): Promise<ClassifiedDispute> {
  // Step 1: Haiku pre-filter (5× cheaper) — is this worth disputing at all?
  const prefilter = await callClaude({
    model: "claude-haiku-4-5",
    schema: PrefilterSchema,  // { worthDisputing: boolean, quickReason: string }
    candidate,
  });

  if (!prefilter.worthDisputing) {
    return buildSkippedClassification(candidate, prefilter.quickReason);
  }

  // Step 2: Sonnet for quality draft text on merit-worthy cases
  return callClaude({
    model: "claude-sonnet-4-6",
    schema: ClassifiedDisputeSchema,
    candidate,
    withEvidence: true,
  });
}
```

Sonnet runs only on ~70% of candidates → ~50% total cost reduction, better draft text on the ones that matter.

### Rate limits (verify in https://console.anthropic.com/settings/limits)

- **Tier 1 (default, $5 deposit):** Sonnet pool ~30K ITPM, 8K OTPM, 50 RPM. Tight if 4 people hammer it concurrently.
- **Tier 2 ($40 deposit):** ~450K ITPM, ~90K OTPM, 1000 RPM. Comfortable.

Haiku has a separate pool, so routing to Haiku bypasses Sonnet's limit.

**Hackathon strategy:**
1. Start on Tier 1, the free $5 credit
2. Add prompt caching from day one (reads don't count toward ITPM)
3. Route pre-filter to Haiku
4. Top up to $40 at hour 18 IF rehearsals show walls — not before

### Gotchas

- `output_config.format` incompatible with citations and prefilling (we don't use those)
- Old `tool_choice: {type: "tool"}` still works if you prefer it; both are fine
- Structured outputs work on Sonnet 4.5+, Haiku 4.5, Opus 4.5+ (all modern)
- Thinking content is omitted from Opus 4.7 responses by default — not our concern (we use Sonnet)

**Sources:** https://docs.claude.com, https://platform.claude.com/docs/en/build-with-claude/structured-outputs, https://platform.claude.com/docs/en/build-with-claude/prompt-caching

---

## Mocked Vanta MCP

We are NOT using real Vanta. No self-serve trial exists. We mock the MCP server so the trust-center narrative reads authentically in the demo without a real tenant.

### Implementation (owned by Worker 4)

Build a tiny Express endpoint in `apps/voice` at `/api/vanta/*` that returns fixture data matching the real Vanta MCP tool surface:

```typescript
// apps/voice/src/routes/vanta-mock.ts
router.get("/api/vanta/trust-center", (req, res) => {
  res.json({
    organization: "Counter",
    controls: {
      total: 52,
      monitored: 47,
      failing: 2,
      not_applicable: 3
    },
    frameworks: ["SOC 2 Type II (in progress)", "HIPAA (monitored)"],
    last_scan: new Date().toISOString(),
    integrations: [
      { name: "GitHub", status: "connected", last_sync: "..." },
      { name: "AWS", status: "connected", last_sync: "..." },
      { name: "Okta", status: "connected", last_sync: "..." }
    ]
  });
});
```

The dashboard's `/trust` page fetches this and renders a convincing "monitored by Vanta" trust center.

### Why this is fine for the demo

Judges see a realistic trust center. The backend being mocked is invisible. The pitch narrative ("Vanta gives us the SOC 2 evidence chain every multi-location operator asks for on call two") is unchanged. We're not fabricating audit evidence — we're mocking the *integration* that would exist on day one of the real product.

**Do NOT claim we have actual SOC 2 compliance in the pitch.** Claim we have the monitoring infrastructure to achieve it. The latter is true the moment we connect a real Vanta tenant post-hackathon.

---

## Next.js 16 + shadcn + Motion + better-sqlite3

### Next.js

- Version: **16.2.x** (latest as of April 2026)
- Command: `npx create-next-app@latest counter-web --yes`
- Defaults: TypeScript + App Router + Tailwind + Turbopack + ESLint + `@/*` alias
- Node 24 LTS (Node 20 EOLs April 30, 2026)
- **Critical for SQLite:** add `serverExternalPackages: ['better-sqlite3']` to `next.config.ts`

### shadcn/ui

- Package is `shadcn`, NOT `shadcn-ui` (renamed August 2024)
- Install: `npx shadcn@latest init` → `npx shadcn@latest add button card dialog input table badge progress`
- CLI v4 (March 2026) adds `--preset`, `--template`, `--base radix|base`, `--dry-run`
- Tailwind v4 is the default

### Motion (formerly Framer Motion)

- Package: `motion` — NOT `framer-motion`
- Install: `npm install motion`
- Import: `import { motion, AnimatePresence } from "motion/react";`
- v12.x has full React 19 support
- Components using `motion.*` still need `"use client"` under RSC

### better-sqlite3

- Version: 12.9+ (April 2026)
- Install: `npm install better-sqlite3`
- Prebuilt binaries for macOS, Linux, Windows — no compilation on mainstream dev machines
- Node 24 recommended
- Alpine/musl Docker needs rebuild (use `node:*-bookworm` if dockerizing)
- Next.js setup: `serverExternalPackages: ['better-sqlite3']` in `next.config.ts`
- NEVER import from a `"use client"` file
- Recommended: `db.pragma('journal_mode = WAL')` at startup

### Scaffold sequence

```bash
nvm install --lts                              # Node 24
npx create-next-app@latest counter-web --yes   # Next.js 16 + Tailwind + App Router
cd counter-web
npx shadcn@latest init -y
npx shadcn@latest add button card dialog input table badge progress skeleton
npm install motion                             # NOT framer-motion
npm install better-sqlite3
# Edit next.config.ts: serverExternalPackages: ['better-sqlite3']
```

---

## Stripe Connect (test mode only)

**Access:** instant on signup. Test keys (`sk_test_...`) visible in dashboard immediately. Enable Connect: Settings → Connect → Get started. No platform review required in test mode.

### Magic test tokens (use these instead of fake real data)

- DOB: `1901-01-01`
- SSN: `000-00-0000`
- Address: `address_full_match` token
- Phone: `000-000-0000`
- SMS verification code: `000-000`

Use **Stripe-hosted Connect onboarding** (redirect, fewest moving parts) or **Embedded Components** (more control). **Do not use the custom API flow** — Stripe is phasing it out.

### What we actually build

- `/api/stripe/onboarding` — creates a Connect account, returns an onboarding link
- Dashboard shows "Counter fee (pending): $178.40" line once onboarding completes
- Webhook handler can be a stub that logs — no need to process real events for the demo

**Source:** https://stripe.com/docs/connect

---

## ngrok (tunnel for Twilio + ElevenLabs webhooks)

**Signup:** https://ngrok.com (free). Grab authtoken at https://dashboard.ngrok.com.

```bash
# One-time setup:
brew install ngrok          # macOS
ngrok config add-authtoken <token>

# Runtime:
ngrok http 4000             # voice service port
# Output: Forwarding https://<subdomain>.ngrok-free.app -> http://localhost:4000
```

### Free tier reality

- 1GB/month bandwidth (way more than we need)
- Stable subdomain tied to your account — not random per session
- HTML responses show an interstitial page. **Webhook POSTs are unaffected.**
- If you hit the interstitial in a browser, add header `ngrok-skip-browser-warning: 1`.

### Fallback if ngrok dies

Cloudflare TryCloudflare, zero signup:
```bash
cloudflared tunnel --url http://localhost:4000
# Output: Your quick Tunnel has been created! Visit it at: https://<words>.trycloudflare.com
```
URL changes per session — requires re-configuring Twilio/ElevenLabs webhooks. Annoying but free.

---

## TinyFish — Worker 3 specifics (BATCH / SSE event list / capture / Vault / step-replay)

> Verified live via `https://docs.tinyfish.ai/llms.txt` and the per-endpoint OpenAPI specs on 2026-04-18. These sections fill the Worker 3 gating stubs and supersede earlier guesses.

### BATCH endpoint — `POST /v1/automation/run-batch`

Used by the W2 "fire 30 disputes" button to enqueue many runs at once.

```
POST https://agent.tinyfish.ai/v1/automation/run-batch
Headers: X-API-Key: <key>, Content-Type: application/json
Body:
  {
    "runs": [                      // 1..100 entries, atomic create
      {
        "url": "https://...",      // required
        "goal": "...",             // required
        "browser_profile": "stealth" | "lite",
        "proxy_config": { "enabled": true, "type": "tetra", "country_code": "US" },
        "agent_config":  { "mode": "default" | "strict", "max_steps": 1..500 },
        "capture_config": { "elements": true, "snapshots": true, "screenshots": true, "recording": true },
        "webhook_url":   "https://...",            // HTTPS only
        "use_vault":     true,
        "credential_item_ids": ["cred:conn-abc:..."]
      }
    ],
    "output_schema": {...}                          // optional JSON Schema draft-07
  }

200 → { "run_ids": ["uuid", ...], "error": null }   // atomic; all-or-nothing
400 → { "error": { "code": "INVALID_INPUT", "message": "...", "details": null } }
403 → INSUFFICIENT_CREDITS                           // not enough credits for batch
```

Error codes returned across all endpoints: `MISSING_API_KEY | INVALID_API_KEY | INVALID_INPUT | RATE_LIMIT_EXCEEDED | INTERNAL_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | SERVICE_BUSY | TIMEOUT | INSUFFICIENT_CREDITS | CONTENT_POLICY_VIOLATION | MAX_STEPS_EXCEEDED | SITE_BLOCKED | TASK_FAILED | CANCELLED`.

### SSE event list — `POST /v1/automation/run-sse`

The full set of `data:` event `type` values the W2 grid + W11 replay must handle:

| Type | Required fields | Notes |
| --- | --- | --- |
| `STARTED` | `run_id`, `timestamp` | First event of every run |
| `STREAMING_URL` | `run_id`, `streaming_url`, `timestamp` | Embed in `<iframe>` for live preview |
| `PROGRESS` | `run_id`, `purpose`, `timestamp`, optional `tinyfish_api: "search" \| "fetch"` | Free-text step description |
| `TF_API_RESULT` | `run_id`, `tinyfish_api`, `result[]`, `timestamp` | Sub-tool result payload |
| `HEARTBEAT` | `timestamp` | Periodic keep-alive (no `run_id`) |
| `COMPLETE` | `run_id`, `status: "COMPLETED" \| "FAILED" \| "CANCELLED"`, `timestamp`, optional `result`, `error`, `help_url`, `help_message` | Terminal event |

**Counter-only synthetic events** (not from TinyFish — emitted by our own classifier wrapper inside the SSE re-broadcast): `STRATEGY_ESCALATED` (when Claude pivots from auto to high-thinking), `FALLBACK_ENGAGED` (when scraper retries with `stealth` profile after a `SITE_BLOCKED`). Documented for the W2 union and W11 timeline markers; never expect TinyFish to emit them.

### `capture_config` (gates W3 evidence)

Optional object on `/run-sse` and `/run-batch`. All flags default false.

```json
"capture_config": {
  "elements":    true,   // serialised DOM nodes the agent interacted with
  "snapshots":   true,   // structured page snapshots per step
  "screenshots": true,   // base64 JPEGs available via /v1/runs/{id}?screenshots=base64
  "recording":   true    // full video, fetched via the run's video_url
}
```

W3's evidence bundle PDF embeds: cover sheet → final screenshot (from `screenshots`) → DOM-element rows (from `elements`) → recording link (from `video_url`, presigned, **expires after 15 minutes** — re-fetch on demand).

### Vault — `GET /v1/vault/items` + `use_vault` / `credential_item_ids` (gates W5)

Vault is a real product (no longer "open issue"). Counter's onboarding wizard:

1. After Stripe step, calls `GET /v1/vault/items` and shows `{itemId, label, vaultName, domains, hasTotp}` for each.
2. User picks the DoorDash login → we store the `itemId` (e.g. `cred:conn-abc:Personal:item-123`).
3. Subsequent `/run-sse` and `/run-batch` calls set `use_vault: true` and `credential_item_ids: [<picked id>]` to pull credentials from the user's password manager without ever holding plaintext.

Connect/sync/disconnect endpoints exist (`POST /v1/vault/connections`, `POST /v1/vault/sync`, `DELETE /v1/vault/connections/{id}`); we only read from `/v1/vault/items` for the demo.

Returns 503 with `{ error.code: "FORBIDDEN" }` if the Vault feature isn't enabled on the account — Counter's W5 wizard falls back to fixture mode in that case.

### Step replay / trace — `GET /v1/runs/{id}?screenshots=base64` (gates W11)

```
GET https://agent.tinyfish.ai/v1/runs/{id}?screenshots=base64
```

Response is the full `ReplayArtifact` source for W11's scrubber:

- `status`, `goal`, `created_at`, `started_at`, `finished_at`, `num_of_steps`
- `result`, `schema_validation` (validation errors per field if `output_schema` was set)
- `error` (with `category: SYSTEM_FAILURE | AGENT_FAILURE | BILLING_FAILURE | UNKNOWN` and `retry_after`)
- `streaming_url` (live only)
- `video_url` — presigned; **15-minute expiry**
- `steps[]` — per-step `{id, timestamp, status, action, screenshot (base64 JPEG), duration}`

Without `?screenshots=base64`, `steps[].screenshot` is `null` (smaller payload — use for the timeline list, then lazy-load the image when a step is clicked).

**Source:** `https://docs.tinyfish.ai/api-reference/automation/start-multiple-automations-asynchronously.md`, `/run-browser-automation-with-sse-streaming.md`, `/vault/list-vault-items.md`, `/runs/get-run-by-id.md` (all fetched 2026-04-18).

---

## Stripe Connect — `transfer.created` payload + webhook signing (test mode, gates W8)

> Verified live via `https://stripe.com/docs/api/transfers/object` and `https://docs.stripe.com/connect/webhooks` on 2026-04-18.

### Transfer object (data.object on `transfer.created`)

```json
{
  "id": "tr_1MiN3gLkdIwHu7ixNCZvFdgA",
  "object": "transfer",
  "amount": 89200,                                  // smallest unit (cents)
  "amount_reversed": 0,
  "balance_transaction": "txn_...",
  "created": 1678043844,                            // unix seconds
  "currency": "usd",
  "description": null,
  "destination": "acct_1MTfjCQ9PRzxEwkZ",           // connected account id
  "destination_payment": "py_...",                  // populated when destination is a Stripe account
  "livemode": false,                                // true in production keys
  "metadata": {},                                   // we set { candidate_id: "disp_NNNN" } here
  "reversals": { "object": "list", "data": [], "has_more": false, "total_count": 0, "url": "/v1/transfers/.../reversals" },
  "reversed": false,
  "source_transaction": null,
  "source_type": "card",                            // card | fpx | bank_account
  "transfer_group": "ORDER_95"                      // we set this to candidate id for grouping
}
```

### Webhook envelope (Connect)

Connect events have a **top-level `account`** property identifying the connected account. The webhook URL must be registered with `connect: true` (or "Events on Connected accounts" in the Dashboard). Sandbox accounts need separate endpoints — production endpoints receive both live and test events, so always check `livemode`.

```json
{
  "id": "evt_...",
  "object": "event",
  "type": "transfer.created",
  "livemode": false,
  "account": "acct_...",
  "pending_webhooks": 1,
  "created": 1349654313,
  "data": { "object": { /* the Transfer object above */ } }
}
```

### Signature verification (use the SDK)

```ts
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// raw bytes — do NOT JSON.parse before verifying
const event = stripe.webhooks.constructEvent(
  rawBody,                                           // string | Buffer
  request.headers.get("stripe-signature")!,
  process.env.STRIPE_WEBHOOK_SECRET!                 // whsec_...
);
```

Throws `Stripe.errors.StripeSignatureVerificationError` on mismatch — return 400. Always read the body as raw bytes (in Next.js App Router: `await request.text()`); do NOT parse first.

### Local testing without an open ngrok

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# In another shell, fire a test event:
stripe trigger transfer.created
```

For Connect-scoped events, use `--forward-connect-to` and `--stripe-account` flags.

**Source:** `https://stripe.com/docs/api/transfers/object`, `https://docs.stripe.com/connect/webhooks` (fetched 2026-04-18).

---

## Open issues flagged during research

- ~~**TinyFish Vault API** for secure credential storage — not publicly documented.~~ Resolved 2026-04-18: Vault is now publicly documented. See the TinyFish Worker 3 specifics section. We still default to fixture mode for the hackathon and only flip to live Vault when a real provider is connected.
- **ElevenLabs concurrency caps** on free tier — not fully published. Test Friday.
- **Twilio outbound to unverified numbers requires paid upgrade** — done in PRE_HACKATHON step 1.

If you encounter an API behavior not covered here, fetch the current docs and add a section. Don't code from memory.
