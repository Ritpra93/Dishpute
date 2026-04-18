# Open Questions

Things we don't have answers to yet. Updated live during the hackathon. Each item has an owner; the owner drives it to a decision by the listed deadline.

## Must resolve before hour 4

- **Mock portal DOM schema.** Worker 1 and Worker 3 need to agree on selectors and data attributes by hour 4 or the scraper can't read the portal. Owner: Worker 1 drafts; Worker 3 acks. Current proposal in `packages/scraper/CLAUDE.md` Task 3.

- **Worker 4 ngrok URL distribution.** Workers 3 and 4 need a shared source of truth for the current tunnel URL. Proposal: pinned message in team chat. Owner: Worker 4 posts updates; all workers check before coding against it.

## Must resolve before hour 8

- **Classifier batch size vs. rate limits.** Start with 10-way concurrency per `CLASSIFIER_CONCURRENCY` constant. If Anthropic tier-1 throttles, drop to 5. Owner: Worker 2 measures at hour 6.

- **Demo caller ID.** Which teammate's phone is the "DoorDash support rep" line during the demo? They need to be verified in Twilio before paid upgrade and physically present at the table during judging. Owner: Ritesh.

## Must resolve before hour 12

- **Outcome seeding strategy.** For the demo, 3 disputes are marked DENIED (for the voice escalation moment), 19 are PENDING, 8 are unresolved. Exact split + which specific dispute IDs are marked DENIED need to be frozen by hour 12 so the demo script matches the seed. Owner: Worker 3 + Ritesh.

- **Dollar counter final amount.** Demo target: $892 recovered. This has to match the sum of `recoverableCents` across the 22 merit ≥ 70 classifications. Owner: Worker 2 tunes fixture amounts to hit $892 exactly.

## Must resolve before hour 20

- **Pitch slide deck vs. no deck.** Check the event rules. If a slide deck is required for submission, build 6 slides max per `docs/SPONSOR_PRIZES.md`. If not, skip entirely. Owner: Ritesh checks at hour 12.

- **Backup video length.** Devpost submission — full 10-min demo recording, or a 2-min highlight reel, or both? Owner: Ritesh.

## Open indefinitely (nice-to-resolve but not blocking)

- **TinyFish Vault API for secure credential storage.** Not publicly documented. For the hackathon, creds in plaintext goal strings are fine (mock portal). In production, need Vault integration — requires conversation with TinyFish team post-hackathon.

- **ElevenLabs free-tier concurrent call cap.** Not published. Single demo call is fine; if we ever run parallel calls, verify.

- **Post-hackathon Vanta integration.** Day-1 priority after the hackathon if we keep building. Mock stays in place until real Vanta tenant is provisioned.

- **Real DoorDash integration strategy.** Legal review on ToS interpretation. Pilot with House of Curry first. Owner: Ritesh, post-hackathon.

## Decisions already made (for reference)

These are locked in. Listed here so new contributors don't reopen them.

- **Mock portal, not real DoorDash** — demo reliability + ToS safety
- **Vanta mocked, not real** — no self-serve trial exists
- **Voice agent identifies as automated** — honest disclosure, safer legally, preferred by ElevenLabs judges
- **Product name: Counter** — final
- **Demo restaurant: House of Curry** — final
- **AWS Kiro: skipped** — overhead not worth it for a beginner team
- **Single-owner Stripe account (Ritesh)** — simpler than multi-user
- **No stage pitch** — 10-minute demo format is the final format
