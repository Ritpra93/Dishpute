# Risks & Pre-Mortem

Every failure mode we expect. Run through this at hour 20.

## Category 1 — Demo-day technical failures

### "The venue wifi is dogshit"
- **Likelihood:** High.
- **Impact:** Catastrophic if any live external call is on the critical demo path.
- **Mitigation:**
  - Scan + classify + submit flow runs against local SQLite + local mock portal — zero external HTTP for beats 2 and 3.
  - Voice call is the one live external dependency. Backup: `apps/voice/public/backup-call.mp3` pre-recorded, loaded in a browser tab, ready to play.
  - Tether one teammate's phone as a backup hotspot.

### "TinyFish returns an error mid-scan on stage"
- **Likelihood:** Medium.
- **Impact:** Beat 2 breaks.
- **Mitigation:**
  - Pre-warm TinyFish 2 minutes before going on stage (silent scan in a terminal).
  - `SCRAPER_MODE=cache` env flag short-circuits to fixture data with realistic latency. Keep it ON for the demo.
  - Seed the SQLite DB with 30 demo disputes before starting. If scan hangs, refresh — disputes appear instantly.

### "The classifier takes 40 seconds and judges lose interest"
- **Likelihood:** High without parallelization.
- **Mitigation:**
  - Parallelize with 10-way concurrency in `classifyMany`. 30 disputes at 1.5s each with 10-way parallelism ≈ 4.5s total.
  - Pre-classify during seed. Dashboard renders already-classified disputes on first paint.
  - Route pre-filter to Haiku 4.5 (5× faster than Sonnet).

### "Voice agent talks over the human / dead air / robotic cadence"
- **Likelihood:** Medium.
- **Mitigation:**
  - Rehearse with the human playing "support rep." Coach them to pause 0.5–1s after the agent.
  - Tune agent response latency in ElevenLabs dashboard.
  - If the call goes sideways live, hang up politely, play backup-call.mp3, narrate over it.

### "Twilio webhook doesn't reach our server because ngrok died"
- **Likelihood:** Medium-low.
- **Mitigation:**
  - ngrok authtoken configured pre-hackathon with a stable subdomain.
  - Fallback: `cloudflared tunnel --url http://localhost:4000` gives a working URL in 30s. Update ElevenLabs webhook URL if needed.

## Category 2 — Hackathon-day build failures

### "Two workers push conflicting changes to `packages/types`"
- **Mitigation:**
  - `packages/types` frozen after hour 2. Changes require explicit ack from every consumer in team chat.
  - All changes via PR, not direct push to main.
  - `pnpm -r typecheck` as pre-commit check.

### "Worker 3's dashboard renders but Worker 1's scraper returns a different shape"
- **Mitigation:**
  - Both sides import from `packages/types`. If types compile on both sides, shapes match.
  - Worker 1 ships fixtures at hour 4. Worker 3's UI works against fixtures by hour 6.

### "Claude Code edits another worker's files"
- **Mitigation:**
  - Scope discipline prompt at every session start (see `docs/CLAUDE_CODE_PRACTICES.md` #2).
  - `git status` before every commit. Revert anything outside your lane.

### "Claude Code hallucinated a library API"
- **Likelihood:** Medium — especially TinyFish, ElevenLabs, Next.js 16.
- **Mitigation:**
  - `docs/VERIFIED_APIS.md` is authoritative. Feed it to every Claude Code session.
  - Before using any method, verify: read `node_modules/<pkg>/dist/*.d.ts` or fetch current docs.
  - If Claude writes code calling a method not in VERIFIED_APIS.md, push back.

## Category 3 — Strategic / pitch failures

### "Judge asks about DoorDash ToS"
- **Memorized answer:** "We don't submit on the merchant's behalf — we pilot their authenticated session. Every action is attributed to their own account. That's the exact architectural choice that keeps us inside the ToS."

### "Another team pitches a chargeback product"
- **Pre-empt:** "This isn't chargebacks — this is platform-internal disputes. Chargeflow and Justt don't touch this."

### "Judge asks why not Playwright"
- **Memorized answer:** "Commercial: DoorDash fingerprints Playwright sessions and blocks them at scale. Architectural: we need to run in the merchant's authenticated session across 500K merchants without IP-throttling. That's what TinyFish was built for."

### "Judge questions the mock portal"
- **Memorized answer:** "We built a fixture portal for a reliable demo — we didn't want to burn test accounts or have DoorDash's UI change mid-hackathon. The architecture is identical: TinyFish + authenticated session + DOM scraping."

## Category 4 — Personal / team failures

### "One teammate crashes at hour 14"
- **Mitigation:**
  - Sleep in shifts per `docs/TIMELINE.md`.
  - Pair on critical-path features. Don't let any worker be solely responsible.

### "Rabbit hole with no exit"
- **Mitigation:**
  - 30-minute rule. Stuck for 30 min → stop, ask in chat, pair, or cut the feature.
  - Use the descope ladder in `docs/TIMELINE.md` without ceremony.

### "We build a beautiful product nobody understands in the demo"
- **Mitigation:**
  - Rehearse 3 times in the last 4 hours.
  - Time every rehearsal. 8–9 min target; under 10 min hard cap.
  - Record backup video. Upload to Devpost before the deadline.

## The three mitigations that matter most

If you remember nothing else:

1. **Seed the DB with demo disputes before every rehearsal.** If anything breaks on stage, refresh and the data is still there.
2. **Pre-record the voice call.** If the live call dies, narrate over the backup audio.
3. **Record the backup video.** Upload to Devpost before the deadline. A working submission survives everything.
