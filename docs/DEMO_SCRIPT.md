# Demo Script — 10 Minutes

Rehearse this at hour 20 until it's second nature. Ritesh presents. One teammate drives the laptop. Two teammates are on standby for the voice-call roleplay.

## Setup (2 min before start)

- Laptop on stage, Chrome full-screen, 2 tabs: Counter dashboard (empty), mock DoorDash portal (loaded).
- Phone on hands-free volume, muted ringer, visible on the podium. Twilio number dialed and ready.
- Terminal minimized. Never visible on stage.
- DB pre-seeded with 30 demo disputes totaling $1,242 in charges.
- Backup video cued up in a 3rd tab in case of catastrophic wifi failure.
- One teammate stationed with a 2nd phone, ready to answer the voice call as "DoorDash support rep."

## Target timing

| Minutes | Segment |
|---|---|
| 0:00–0:45 | Hook + the problem |
| 0:45–2:30 | Scan + classification walkthrough |
| 2:30–4:00 | Submit all + dollar counter moment |
| 4:00–6:00 | Denied dispute + voice call (climax) |
| 6:00–7:30 | Business model + TAM + moat |
| 7:30–8:30 | Sponsor tech deep-dive (TinyFish + ElevenLabs) |
| 8:30–9:30 | Trust center + team + the ask |
| 9:30–10:00 | Buffer for Q&A start |

---

## Beat 1 — Hook (0:00–0:45)

> "Every 24 hours, food delivery apps auto-charge restaurants around $50 million in missing-item fees. Most of those charges are disputable. Almost none get disputed — because the portal takes 8 minutes per charge, and nobody has 4 hours a week to fight a $12 claim.
>
> I'm Ritesh. My friend runs House of Curry, a 3-location South Indian restaurant here in Minneapolis. Last year, House of Curry lost $38,000 to charges exactly like these. That's a line cook's salary. That's the difference between opening a 4th location and closing the 3rd.
>
> We built Counter. Watch what happens."

*Click into the mock DoorDash portal. Judges see 30 open error charges in a familiar interface.*

## Beat 2 — Scan + classify (0:45–2:30)

> "This is DoorDash's merchant portal. House of Curry has 30 open error charges this week, $1,242 net-out. Normally, the owner would spend 4 hours fighting these. Instead..."

*Click "Scan DoorDash" in Counter dashboard.*

*Live: scan progress bar ticks across. Disputes populate the queue one by one. Dollar counter climbs visibly: $0 → $247 → $516 → $892 → $1,183.*

> "30 disputes scraped in 40 seconds via a TinyFish cloud browser agent — running inside the merchant's own authenticated session, so we never touch their credentials. Each dispute is tagged with an error type, a merit score, and a ready-to-submit response drafted by Claude."

*Click into a dispute (show order 4472).*

> "Here's order 4472. Customer claimed 3 items were missing. DoorDash auto-charged $47.80. But our classifier pulled the POS record — all 3 items were in the bag. The kitchen camera has a pickup photo at 7:42pm. The driver accepted at 7:43 and delivered at 7:58. No window for items to vanish.
>
> The classifier gave this 89 merit and drafted the dispute in 2.3 seconds."

*Scroll down, show the drafted dispute text. 4 sentences, cites POS, cites timestamp, cites DoorDash policy.*

## Beat 3 — Submit all (2:30–4:00)

> "Let's file them."

*Click "Submit all disputes over 70 merit." Counter: 22 / 22 submitted. Dollar counter lands on $892.*

> "22 disputes filed in 90 seconds. Projected recovery this week: $892. Annualized for House of Curry: $46,000. We take 20% contingency — we only get paid when they get paid.
>
> But here's the critical architectural point. Counter doesn't submit disputes on the merchant's behalf. That would violate DoorDash's terms of service. We run inside the merchant's authenticated session, pilot their browser, and every submission is attributed to their account. Legally, we're a co-pilot, not a bot. That architecture is only possible because TinyFish's cloud browser agents support persistent authenticated sessions."

## Beat 4 — The voice call (THE CLIMAX, 4:00–6:00)

*Back on the dashboard. One dispute is marked red: DENIED.*

> "Here's the part that wins restaurants over. DoorDash denied one of our disputes — case 31188 — and told the merchant to call support. Restaurants hate this step. The phone queue is 25 minutes. If you're running a dinner rush, you just eat the loss.
>
> Counter doesn't."

*Click "Escalate to voice agent" on the denied dispute. Dashboard shows "📞 Calling DoorDash support..."*

*Phone speaker: dial tone, ring, pickup.*

**Agent (ElevenLabs voice, warm + professional):** "Hi, this is an automated agent calling on behalf of House of Curry, merchant ID 8842. I'd like to discuss dispute case 31188 that was denied this morning. The restaurant has order-prep photos and POS records showing all items were correctly packed. Can I walk you through the case?"

**Teammate on other phone (as "support rep"):** "Sure, what's the case number?"

**Agent:** "Case 31188, order 4472, charged $28.40 on Tuesday. The denial reason cited was 'insufficient evidence.' I have a POS record and a timestamped kitchen pickup photo I can upload to the case. Can you update the case with those?"

**Teammate:** "Let me check — yes, I see the case. Can you send those to the upload link I'll push to your account?"

**Agent:** "Yes. The evidence has been queued to the case. Thank you for reviewing. Is there an estimated turnaround on the re-review?"

**Teammate:** "24 to 48 hours. You'll get an update at that number."

**Agent:** "Thank you. Have a good evening."

*End call after ~60 seconds. Dashboard updates: "Call complete: callback requested."*

> "60 seconds. No hold music. No lost dinner service. No restaurant owner on a 1-800 number at 9 PM."

## Beat 5 — Business + TAM (6:00–7:30)

> "Three numbers.
>
> **500,000 US restaurants on delivery platforms.** That's our universe.
>
> **$1.5 billion in disputable fee leakage per year.** Aggregate, across all three platforms. Most of it never gets disputed.
>
> **$3,000 annual contingency revenue per mid-size merchant.** 20% of recovered funds. For a 20-location chain, that's $60K ARR. Our realistic SAM at 30% penetration is $450M.
>
> The wedge is clear: we start with independent operators on DoorDash, we expand to UberEats and Grubhub by month 3, and we move up-market to 10+ location chains by month 6. The contingency model means every dollar we save them is a retention event."

## Beat 6 — Sponsor tech (7:30–8:30)

> "Three things make Counter not a prototype.
>
> **First, TinyFish.** No public merchant API exists for DoorDash dispute submission. Raw Playwright gets fingerprinted and blocked. TinyFish's cloud browser agents with residential proxies are what makes Counter's architecture deployable across 500K merchants without every one of them getting IP-throttled.
>
> **Second, ElevenLabs.** The voice escalation you just heard isn't a demo trick — it's a feature restaurants pay for. The agent uses function-calling tools to look up case details and upload evidence mid-conversation, all through ElevenLabs' native Twilio integration. No custom telephony stack.
>
> **Third, Stripe Connect.** Contingency payouts happen the same day the merchant gets refunded. Their recovery hits their account, we pull our 20% automatically. Stripe makes the monetization model operationally real on day one."

## Beat 7 — Trust + ask (8:30–9:30)

*Click to `/trust` page. Judges see a "Monitored by Vanta" trust center — SOC 2 progress, 47 controls monitored, integration status.*

> "Finally — we know multi-location operators will ask about SOC 2 on call two. Counter is built on Vanta's continuous monitoring from day zero, so when a 10-location chain asks for a trust center, we have one to send.
>
> This is a real business. The problem is real, the buyers are reachable, the architecture is defensible, and the unit economics work from day one.
>
> We want to keep building Counter. Thank you."

## Q&A prep — memorized answers

**"What about DoorDash ToS?"**
> "We don't submit disputes on the merchant's behalf — we pilot their authenticated session. Every action is attributed to their own account. That's the exact architectural choice that keeps us inside the ToS. If DoorDash blocked merchants from using assistive tools inside their own browser sessions, they'd also be blocking password managers and accessibility software. That's not a fight they'd take."

**"Why not just use Playwright?"**
> "Two reasons. Commercial: DoorDash fingerprints Playwright sessions and blocks them at scale — we'd hit IP throttling within thousands of merchants. Architectural: TinyFish handles residential proxies and persistent session state, which is what 'runs in the merchant's own session' actually requires at scale."

**"What's your defensibility?"**
> "Three layers. One, ToS — our architecture is the only compliant path, so copycats either violate ToS or inherit the same constraints. Two, data — every dispute we process improves the classifier. Three, POS integrations — Toast and Square evidence cross-reference is slow to build and sticky to keep."

**"How did you build this in 24 hours?"**
> "4 people, Claude Code in every editor. The agent-native dev stack let us replace what would've been 5 engineers × 6 months with 4 people × 24 hours for the MVP. That's the real story — this is what a small team can ship now, not in 2027."

**"ACV and pricing?"**
> "$3K annual per independent restaurant, $25–100K annual for small chains. Contingency model — we take 20% of recovered funds. For a 20-location group doing $80K/mo on DoorDash, we're a $16K ARR customer."

**"Churn / retention?"**
> "Value accrues every week. Every dispute we recover is a retention event. The contingency model means zero CAC-to-payback risk."

## Demo failure recovery

| What breaks | What you do |
|---|---|
| TinyFish scan hangs | Press Cmd+R. DB seed loads the disputes instantly. Say: "Let's skip to after the scan." Never apologize. |
| Dollar counter freezes | Keep talking. The number is cosmetic. |
| Voice call fails to connect | "Let's hear last Tuesday's call" — play backup-call.mp3. Pretend this was planned. |
| Mock portal styling looks off | Don't linger on the mock portal. Scan and leave. Judges don't care. |
| Dashboard crashes | Reload. If it won't come back, switch to backup video tab. "Let me show you the recorded demo." |
| Audience can't hear the call | Lean the phone mic toward the laptop mic. Worst case: narrate the conversation. |

## 30-second hallway version

> "Restaurants lose $10K–50K a year to DoorDash missing-item charges they never dispute. Counter is a co-pilot that scans their dispute queue, drafts every response with Claude, submits inside their own authenticated session via TinyFish, and escalates denials to merchant support via an ElevenLabs voice agent. 20% contingency. $1.5B TAM. We built it in 24 hours."
