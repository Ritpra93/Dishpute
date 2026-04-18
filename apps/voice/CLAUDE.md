# apps/voice — ElevenLabs Voice Escalation + Vanta Mock

> **You are Worker 4.** Read order: `../../CLAUDE.md` → `../../docs/VERIFIED_APIS.md` (ElevenLabs + Vanta + ngrok sections — memorize) → `../../docs/INTERFACES.md` → `../../docs/DEMO_SCRIPT.md` (Beat 4 is yours) → this file.

## What this app is

A standalone Express server that:

1. **Initiates outbound calls** to the merchant's support line when a dispute gets denied. Uses ElevenLabs Conversational AI with native Twilio integration.
2. **Serves function-calling tool endpoints** for the agent to call mid-conversation (case lookup, evidence reference, escalation).
3. **Receives post-call webhooks** from ElevenLabs with transcripts, verifies signatures, parses outcomes.
4. **Serves the mocked Vanta trust-center endpoint** so the dashboard's `/trust` page reads authentically.

Isolated in its own process because Twilio/ElevenLabs webhooks need a public URL via ngrok, and we don't want webhook issues to crash the dashboard mid-demo.

## Scope

**You modify:** `apps/voice/**` only.
**You do not modify:** anything else (exception: you may update the root `.mcp.json` if we end up exposing the Vanta mock via MCP).

## Task order

### Task 1 — Scaffold + stub outbound (hour 2–3)

Before coding, quote back to me from `docs/VERIFIED_APIS.md`:
- Exact ElevenLabs endpoint URL for outbound call via Twilio native integration
- Required headers
- Shape of `conversation_initiation_client_data.dynamic_variables`
- Post-call webhook signature-verification method (library + function name)

```bash
# From apps/voice
npm init -y
npm install express cors @elevenlabs/elevenlabs-js twilio
npm install -D typescript tsx @types/express @types/cors @types/node
```

Files:
- `package.json` — `name: "@counter/voice"`, scripts: `"dev": "tsx watch src/server.ts"`, `"start": "tsx src/server.ts"`, deps: `@counter/types` (workspace)
- `tsconfig.json` strict
- `src/server.ts` — Express app on port 4000
- `src/routes/calls.ts` — stub `POST /calls/outbound` returning a fake `VoiceCallRecord`
- `__fixtures__/call-transcripts.json` — 3 realistic call transcripts (successful recovery, still denied, callback requested)
- `test/smoke.test.ts` — hits `/calls/outbound`, asserts shape

Commit: `feat(voice): scaffold express + stub outbound endpoint`

### Task 2 — ngrok tunnel (hour 3, ~15 min)

```bash
# Install ngrok globally, one-time setup on hackathon day:
ngrok config add-authtoken <token from env>
ngrok http 4000
# Copy the forwarding URL to .env.local as NGROK_PUBLIC_URL
```

Start `ngrok http 4000` in a separate terminal and keep it running. The URL is stable for the session (free tier gives you a consistent subdomain per account).

Fallback if ngrok has issues:
```bash
cloudflared tunnel --url http://localhost:4000
```

Document the current public URL in team chat so Workers 1/3 can call `/calls/outbound` if they need to.

### Task 3 — Real ElevenLabs outbound call (hour 4–6)

**Before writing code:** the ElevenLabs agent must exist in the dashboard. Ritesh sets this up per `PRE_HACKATHON.md`. You do NOT create the agent programmatically. You configure it in the ElevenLabs UI.

Agent settings (configure in ElevenLabs dashboard):
- Voice: Eleven Flash v2.5, warm professional voice (any of the default ones — pick one that sounds human, not robotic)
- Language: en
- Turn-taking: eagerness = normal, user_input_timeout = 10s for tech support calls, barge-in enabled
- Model: Claude 3.5 Sonnet (ElevenLabs's internal routing — pick whatever their agent platform currently supports; don't confuse with our Anthropic SDK usage)
- System prompt (paste this exactly):

```
You are an automated agent calling on behalf of {{merchant_name}}, a restaurant
merchant disputing a charge on DoorDash.

Your task: help the support representative locate dispute case {{case_number}},
reference the evidence we already uploaded, and either get the denial reversed
or escalate to a supervisor.

IMPORTANT — honest disclosure: open every call by identifying as an automated
agent. Do not pretend to be human. Do not claim to be the merchant.
Example opening: "Hi, this is an automated agent calling on behalf of {{merchant_name}}.
I'd like to discuss dispute case {{case_number}} that was denied this morning."

Conversation guidelines:
- Professional, calm, never accusatory
- Keep responses under 20 seconds unless explicitly asked for more detail
- Let the rep talk. Do not interrupt.
- If the rep asks for the case number, say it clearly: {{case_number}}
- If the rep can't find the case: use the lookup_dispute_case tool
- If the rep says the denial stands: reference the evidence with reference_evidence
- If the rep cannot help: use escalate_to_supervisor
- End the call politely — thank them for their time

If asked whether you're a bot: yes, say so plainly. You are calling on behalf of
the merchant with their authorization.

The denial reason we received was: {{denial_reason}}
```

- Dynamic variables enabled (security tab must allow this):
  - `case_number`, `merchant_name`, `denial_reason`, `case_id`

- Tools (configure 3 webhook tools pointing at YOUR ngrok URL):
  - `lookup_dispute_case` → `POST {NGROK_URL}/tools/lookup_case` with `{caseId: string}`
  - `reference_evidence` → `POST {NGROK_URL}/tools/reference_evidence` with `{caseId: string}`
  - `escalate_to_supervisor` → `POST {NGROK_URL}/tools/escalate_to_supervisor` with `{reason: string, caseId: string}`

Now in code, implement the real outbound call:

```typescript
// src/elevenlabs.ts
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

export async function initiateOutboundCall(opts: {
  toNumber: string;
  dynamicVariables: {
    case_number: string;
    merchant_name: string;
    denial_reason: string;
    case_id: string;
  };
}) {
  const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/outbound-call", {
    method: "POST",
    headers: {
      "xi-api-key": process.env.ELEVENLABS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      agent_id: process.env.ELEVENLABS_AGENT_ID,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
      to_number: opts.toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: opts.dynamicVariables,
      },
      call_recording_enabled: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs outbound-call ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<{
    success: boolean;
    conversation_id: string;
    callSid: string;  // note: camelCase, not snake_case
  }>;
}
```

`POST /calls/outbound` wires this up, persists a `VoiceCallRecord` in shared SQLite (via better-sqlite3; connect to the same `counter.db` as apps/web), and returns it.

### Task 4 — Function-calling tool webhooks (hour 6–9)

`src/routes/tools.ts` — three endpoints the agent hits mid-conversation.

**Critical: all tool responses must return in under 1.5 seconds.** Slow tool = dead air = demo failure.

```typescript
router.post("/tools/lookup_case", async (req, res) => {
  const { caseId } = req.body;
  // Read from shared SQLite, find the dispute + classification
  // Return a concise, speakable response:
  res.json({
    caseNumber: "31188",
    merchantName: "House of Curry",
    chargeAmount: "$28.40",
    denialReason: "Insufficient evidence",
    evidenceSummary: "POS record shows all items dispatched. Kitchen pickup photo timestamped at 19:42. Driver log confirms delivery at 19:58."
  });
});

router.post("/tools/reference_evidence", async (req, res) => {
  const { caseId } = req.body;
  // Return evidence citations, pre-formatted
  res.json({
    citations: [
      "POS transaction 4472 confirms all 3 items were prepared and bagged at 19:38",
      "Kitchen pickup photo timestamped 19:42 shows complete order",
      "Driver log shows on-time delivery at 19:58, no customer contact issues"
    ]
  });
});

router.post("/tools/escalate_to_supervisor", async (req, res) => {
  const { reason, caseId } = req.body;
  // Log the escalation, return a fake ticket ID
  res.json({
    escalationTicketId: `ESC-${Date.now()}`,
    message: "Escalation logged. A supervisor will review within 24 hours."
  });
});
```

Return `200 OK` even if the internal lookup fails — return a fallback message. **4xx responses are NOT retried by ElevenLabs**; a crash here means the agent has no response and calls go silent.

### Task 5 — Post-call webhook (hour 9–11)

`src/routes/webhooks.ts`:

```typescript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import express from "express";

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY! });

router.post(
  "/webhooks/elevenlabs/post-call",
  express.raw({ type: "application/json" }),  // CRITICAL: raw body for signature check
  async (req, res) => {
    try {
      const sig = req.header("ElevenLabs-Signature");
      if (!sig) return res.status(401).send("missing signature");

      const event = client.webhooks.constructEvent(
        req.body.toString("utf-8"),
        sig,
        process.env.ELEVENLABS_WEBHOOK_SECRET!
      );

      if (event.type === "post_call_transcription") {
        const { conversation_id, transcript, analysis, conversation_initiation_client_data } = event.data;
        const caseId = conversation_initiation_client_data?.dynamic_variables?.case_id;

        // Persist to voice_calls table
        // Optionally: use Claude to parse transcript into callOutcome (recovered / still_denied / callback_requested)
      }

      // ALWAYS return 200 — ElevenLabs doesn't retry 4xx
      res.status(200).json({ status: "ok" });
    } catch (err) {
      console.error("webhook error", err);
      res.status(200).json({ status: "logged-as-error" });  // still 200
    }
  }
);
```

Register webhook URL in ElevenLabs dashboard: `{NGROK_URL}/webhooks/elevenlabs/post-call`. Copy webhook secret to `.env.local` as `ELEVENLABS_WEBHOOK_SECRET`.

### Task 6 — Mock Vanta endpoint (hour 11–12)

`src/routes/vanta.ts`:

```typescript
router.get("/api/vanta/trust-center", (_req, res) => {
  res.json({
    organization: "Counter",
    controls: {
      total: 52,
      monitored: 47,
      failing: 2,
      not_applicable: 3
    },
    frameworks: [
      { name: "SOC 2 Type II", status: "in_progress", progress_pct: 73 },
      { name: "HIPAA", status: "monitored", progress_pct: 100 }
    ],
    last_scan: new Date().toISOString(),
    integrations: [
      { name: "GitHub",  status: "connected", last_sync: new Date(Date.now() - 3 * 60_000).toISOString() },
      { name: "AWS",     status: "connected", last_sync: new Date(Date.now() - 7 * 60_000).toISOString() },
      { name: "Okta",    status: "connected", last_sync: new Date(Date.now() - 12 * 60_000).toISOString() },
      { name: "Linear",  status: "connected", last_sync: new Date(Date.now() - 4 * 60_000).toISOString() }
    ]
  });
});
```

That's it. Dashboard proxies this at `/api/trust` and renders a trust page.

### Task 7 — Backup audio (hour 14–16) — CRITICAL

**Pre-record a perfect version of the call.** Multiple takes. This is the demo-safety-net.

Process:
1. Use the real ElevenLabs agent to call a teammate
2. Record the audio (local screen capture or phone recording)
3. Multiple takes; keep the best one
4. Convert to MP3, save as `public/backup-call.mp3`
5. Create `public/backup-call.html` — a tiny page with a big play button
6. Verify it plays. Verify audio levels are good.

During the demo, if the live call fails, open `{NGROK_URL}/backup-call.html` in the browser and hit play. Narrate over it.

### Task 8 — Rehearsal + debugging (hour 16+)

- Full end-to-end call, multiple times
- Tune agent timing (pauses, interruption thresholds)
- Coach the "support rep" teammate on realistic responses and pause timing
- Time the whole call — target 45–75 seconds on stage

## Verified ElevenLabs facts (quote back before coding)

From `docs/VERIFIED_APIS.md`:
- Outbound endpoint: `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call`
- Auth header: `xi-api-key: <key>`
- Body: `agent_id`, `agent_phone_number_id`, `to_number`, `conversation_initiation_client_data.dynamic_variables`, `call_recording_enabled`
- Response: `{ success, conversation_id, callSid }` (note `callSid` camelCase)
- Dynamic variables in prompts use `{{var_name}}` syntax
- Post-call webhook verification: `client.webhooks.constructEvent(body, signature, secret)` from `@elevenlabs/elevenlabs-js`
- Post-call webhook requires `express.raw({ type: "application/json" })` — NOT a JSON parser
- Webhooks: return 200 even on internal errors; 4xx are not retried
- Agent tools: `webhook` | `client` | `mcp` | `system` — we use `webhook` type
- Native Twilio integration via dashboard — NOT custom Media Streams WebSocket

## Verified package note

- Use `@elevenlabs/elevenlabs-js` — the TypeScript SDK
- There is no separate "ElevenAgents SDK"; it's the same package

## Exit criteria

- `pnpm -F @counter/voice dev` boots Express on port 4000
- ngrok tunnel live with stable URL
- `POST /calls/outbound` triggers a real phone call that rings the test number
- Agent picks up, identifies as automated agent, asks about the case
- Agent successfully calls `lookup_dispute_case` mid-conversation
- Post-call webhook fires; signature verifies; transcript persists to SQLite
- `GET /api/vanta/trust-center` returns the mocked data
- `public/backup-call.mp3` pre-recorded and tested

## Rules

1. **`apps/voice/` only.**
2. **Native Twilio integration via ElevenLabs dashboard.** Do NOT build custom Media Streams WebSocket.
3. **Create the agent in the UI, not programmatically.** Configure tools, voice, prompt in the dashboard.
4. **Tool responses return 200 in under 1.5s.** Even on error — return a fallback message, not a 5xx.
5. **Webhook: `express.raw()` body parser.** Never JSON.parse on this route.
6. **Agent identifies as automated.** Non-negotiable. Sets us apart from shady voice agents and wins ElevenLabs judges.
7. **Pre-record backup audio.** Non-negotiable. The demo must survive wifi failure.
8. **Coordinate ngrok URL with Worker 3** — they need it for `/api/disputes/[id]/escalate`.
