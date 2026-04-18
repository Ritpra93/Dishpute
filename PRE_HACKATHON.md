# Pre-Hackathon Checklist

This is all the work that happens BEFORE the hackathon starts, so the first 2 hours aren't burned on account setup and DNS propagation. Ritesh owns all accounts (single-owner model — simpler than credential sharing).

## The weekend before

### 1. Create all accounts (Ritesh, ~45 min total)

Each of these is self-serve and instant unless flagged. After signup, drop API keys into a shared password manager (1Password free tier or even a shared encrypted doc) so teammates can pull them Saturday morning.

- [ ] **Anthropic API** — https://console.anthropic.com. Use the same email as your Claude.ai account. Don't need to pay anything up front — every new account gets free credits. Add $5 to be safe. Generate an API key, label it `counter-hackathon`.
- [ ] **TinyFish** — https://agent.tinyfish.ai/sign-in. 500 free credits, no card needed. Grab API key at `/api-keys`.
- [ ] **ElevenLabs** — https://elevenlabs.io. Free tier works for signup. Once in: navigate to ElevenAgents → Agents → Create. Build the agent with the system prompt from `apps/voice/CLAUDE.md` (copy-paste exactly). Voice: pick Eleven Flash v2.5 for the model, any warm credible voice. Note the `AGENT_ID` from the URL.
- [ ] **Twilio** — https://twilio.com/try-twilio. $15 trial credit, no card. Buy one US voice-capable number (~$1.15/mo equivalent). **Critical: upgrade to paid ($20 minimum) before Saturday** so outbound calls can reach unverified numbers. Trial-only accounts can only call Verified Caller IDs and play a trial warning.
- [ ] **Stripe** — https://dashboard.stripe.com/register. Immediate test-mode access. Enable Connect: Settings → Connect → Get started. Copy test keys (`sk_test_...`, `pk_test_...`, platform client ID `ca_...`).
- [ ] **ngrok** — https://ngrok.com. Free tier. Grab authtoken at https://dashboard.ngrok.com/get-started/your-authtoken. Everyone on the team installs the CLI locally but only Worker 4 needs the token.
- [ ] **GitHub repo** — create `counter` as private. Push the scaffold. Add 3 collaborators.

### 2. Connect Twilio to ElevenLabs (15 min)

In ElevenLabs dashboard → ElevenAgents → Phone Numbers → Import phone number:
- Label: "Counter Demo"
- Phone number: your Twilio number in E.164 format (+1...)
- Twilio SID (Account SID from Twilio console)
- Twilio Token (Auth Token from Twilio console)

ElevenLabs auto-configures Twilio's Voice webhook to point at their system. You don't manually wire TwiML. Test with the "Call agent" button in ElevenLabs — call your cell from your Twilio number, make sure the agent picks up and responds.

**Save the Phone Number ID** shown in the ElevenLabs UI — you need it for outbound calls.

### 3. Test Claude Code subscription (10 min each, everyone)

Everyone on the team:
- [ ] Open VS Code
- [ ] Install Claude Code extension if not already: https://docs.claude.com/en/docs/claude-code
- [ ] `claude login` in a terminal, sign in with your Claude.ai Pro account
- [ ] Run a trivial test: open any folder, ask Claude Code "what files are here?"
- [ ] If anyone hits a rate limit or auth issue, find out now, not Saturday

### 4. Friday-night dry run (30 min, all together on video call)

- [ ] Each person clones the repo
- [ ] Each person opens VS Code **at their assigned worker subdirectory** (not repo root)
- [ ] Each person launches Claude Code in that directory
- [ ] Each person pastes their kickoff prompt from `docs/KICKOFF_PROMPTS.md`
- [ ] Verify Claude reads the files and reports back a plan — don't let it start coding
- [ ] Stop. The goal is to prove the logistics work. Actual coding starts Saturday.

If anyone can't get Claude Code open in their subdirectory, fix it Friday night, not Saturday morning.

## Saturday morning, before T+0

### 1. Worker assignments (10 min, in person or on call)

Ritesh has a suggested default (below), but the team can override. The key constraint: Worker 4 takes the most external-infra-risk (Twilio + ElevenLabs + ngrok + webhook tunneling). Assign whoever is most comfortable debugging connection issues.

**Suggested assignments:**
- **Worker 3 (web) → Ritesh.** You have Next.js experience; the frontend is the single most demo-critical surface. Your animation + dashboard UI skills matter here more than anywhere else.
- **Worker 1 (scraper)** → Whichever teammate is strongest at reading docs and tolerating ambiguity. TinyFish doesn't have a typed SDK, so it's "read the REST docs + build the client yourself."
- **Worker 2 (classifier)** → Whoever is most patient with prompt tuning and quality iteration. This is the craft role.
- **Worker 4 (voice)** → Whoever has the highest pain tolerance for infrastructure debugging. They'll spend 2 hours on ngrok + Twilio + ElevenLabs webhook flow alone.

### 2. Credential distribution (5 min)

Ritesh shares `.env.local` content (not committed) via the shared vault. Every worker pulls the ones they need into their own local `.env.local`:
- Worker 1: `TINYFISH_API_KEY`, `ANTHROPIC_API_KEY`
- Worker 2: `ANTHROPIC_API_KEY`
- Worker 3: `ANTHROPIC_API_KEY` (for the classifier proxy), `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
- Worker 4: `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`, `ELEVENLABS_PHONE_NUMBER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `NGROK_AUTHTOKEN`, `ANTHROPIC_API_KEY`

## What's explicitly skipped

- **Vanta account** — no self-serve trial. We mock the MCP server locally. No account needed.
- **AWS Kiro** — the spec-driven workflow adds overhead that doesn't pay off for a beginner team. Skip that prize.
- **Sales calls / KYC processes** — nothing in this stack requires one.
- **A2P 10DLC registration** — only applies to SMS, not voice. We're voice-only for the demo.

## Budget

Everything up to and including the hackathon should come in under **$40 total**:

- Anthropic API: $5 prepaid credit (we'll use maybe $2 of it)
- Twilio paid upgrade: $20 minimum
- ngrok: $0 (free tier)
- TinyFish: $0 (500 free credits)
- ElevenLabs: $0 (free tier for setup; demo calls probably cost <$1)
- Stripe: $0 (test mode)
- Everything else: $0

If rehearsals reveal rate-limit issues, top up Anthropic to $40 to hit Tier 2. Do this Saturday evening if needed, not Saturday morning.
