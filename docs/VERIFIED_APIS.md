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

## Vanta MCP integration (Tier 2: real client, fixture-backed)

We speak the **official Vanta MCP protocol** via `@vantasdk/vanta-mcp-server` over stdio. We do not have a Vanta tenant for the demo, so the client gracefully falls back to local fixtures shaped like real Vanta API responses. The same code path runs the moment someone provisions a tenant — flip one env var and we're live.

### Official tool surface

Source: [VantaInc/vanta-mcp-server README](https://github.com/VantaInc/vanta-mcp-server). Top-level tools are NOT prefixed with `list_` (that prefix is from an unofficial fork — we use the real names):

- `frameworks` — list compliance frameworks the tenant is tracking (SOC 2, ISO 27001, ISO 42001, HIPAA, GDPR, etc.)
- `controls` — list controls with status, framework mappings, owner
- `tests` — list automated tests with `statusFilter` (PASSING/FAILING/NEEDS_ATTENTION/NOT_APPLICABLE), `frameworkFilter`, `integrationFilter`
- `integrations` — list connected integrations (GitHub, AWS, Okta, etc.) with `connectionStatus` and `resourceKinds`
- `documents` — list policy and audit documents

Dependent tools we don't currently call but have shaped fixtures for: `list_control_tests`, `list_control_documents`, `list_framework_controls`, `list_test_entities`, `document_resources`, `integration_resources`. There are also `people`, `risks`, `vulnerabilities`, and a `trust-centers` operation in the official server.

### Implementation

`apps/voice/src/lib/vanta-mcp.ts` is a `VantaMcpClient` singleton:

- Lazy-connects on first `callTool` invocation using `StdioClientTransport` from `@modelcontextprotocol/sdk`.
- Spawns `npx -y @vantasdk/vanta-mcp-server` with `VANTA_ENV_FILE` pointing at the OAuth credentials JSON.
- Connection has a 500ms timeout — we never block a request on a cold MCP connect; falls through to fixture if connect is slow.
- Every response is `{ source: "live" | "fixture", fallbackReason?, data }` so callers and the demo UI know which mode is active.
- Logs `[vanta-mcp] live` vs `[vanta-mcp] fixture (reason: ...)` so the demo console shows the truth.

`apps/voice/src/routes/vanta.ts` exposes REST endpoints that mirror the MCP tool surface 1:1 (`GET /api/vanta/frameworks`, `/controls`, `/tests`, `/integrations`, `/documents`) plus a composite `/api/vanta/trust-center` rollup for the dashboard.

`apps/voice/__fixtures__/vanta/{frameworks,controls,tests,integrations,documents}.json` contain fixture data shaped exactly like the [Vanta REST API responses](https://developer.vanta.com/reference/listcontrols), envelope and all (`{ results: { data: [...], pageInfo: {...} } }`).

### Pre-flight gate (the load-bearing piece)

`apps/web/lib/vanta-gate.ts` calls `GET /api/vanta/tests?frameworkFilter=soc2` before every voice escalation. If any test in a critical category (`data_security`, `access_control`, `ai_governance`) is `FAILING` or `NEEDS_ATTENTION`, the escalate route returns `409 Conflict` with `{ code: "vanta_pre_flight_blocked", gate: { failingCritical: [...] } }`. On success, the escalate response includes `vantaGate: { source, controlsChecked, passed: true }` so the UI can render a "Vanta pre-flight: passed" badge.

Fail-open policy: if the Vanta service itself is unreachable (network error, voice service down), the gate logs loudly and proceeds — a Vanta outage must not freeze the dashboard mid-demo. The audit log records `source: "unreachable"` so the operator can later confirm what happened.

### Going live

```bash
# Provision OAuth credentials at https://developer.vanta.com/docs/api-access-setup
# Save them to a JSON file:
echo '{"client_id":"...","client_secret":"..."}' > /secure/vanta.env

# Point the voice service at it:
export VANTA_ENV_FILE=/secure/vanta.env
pnpm -F @counter/voice dev

# That's it. No code changes.
```

### Why this is defensible to a Vanta judge

We are NOT claiming SOC 2 certification. The trust page copy says "monitored by Vanta," not "certified." The published `/trust/aims` ISO 42001 AI Impact Assessment is real product work — purpose, data flows, human-in-the-loop gates, risk register, rollback procedure — not boilerplate. The pre-flight gate makes Vanta a load-bearing dependency: rip it out and the dispute agent loses its compliance check.

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

## Open issues flagged during research

- **TinyFish Vault API** for secure credential storage — not publicly documented. We use plaintext in goal strings for the hackathon. Fine for a mock portal; unsafe in production.
- **ElevenLabs concurrency caps** on free tier — not fully published. Test Friday.
- **Twilio outbound to unverified numbers requires paid upgrade** — done in PRE_HACKATHON step 1.

If you encounter an API behavior not covered here, fetch the current docs and add a section. Don't code from memory.
