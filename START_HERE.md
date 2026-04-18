# START HERE — First 30 Minutes of the Hackathon

Drift in the first 30 minutes costs you the demo. Follow this exactly.

## Prerequisite

You've completed everything in `PRE_HACKATHON.md`. If you haven't, do that first.

## T+0:00 to T+0:10 — Together

1. Read `CLAUDE.md` at the repo root out loud together. Confirm everyone has the same mental model. 5 minutes.
2. Confirm worker assignments from `PRE_HACKATHON.md`. If anyone wants to swap, do it now.
3. Ritesh shares `.env.local` contents via the shared vault. Everyone pulls the vars they need.

## T+0:10 to T+0:15 — Open your workspace

Each worker, on their own laptop:

```bash
git clone git@github.com:ritesh/counter.git
cd counter

# Open VS Code AT YOUR WORKER DIRECTORY, not the repo root
# This is critical — it focuses Claude Code's context on your lane.

# Worker 1:
code packages/scraper

# Worker 2:
code packages/classifier

# Worker 3 (Ritesh):
code apps/web

# Worker 4:
code apps/voice
```

Inside VS Code, open Claude Code (Cmd+Esc on Mac, Ctrl+Esc on Windows).

## T+0:15 to T+0:25 — Paste your kickoff prompt

Each worker pastes their specific kickoff prompt from `docs/KICKOFF_PROMPTS.md` (scroll to your worker's section).

Claude Code will:
1. Read your CLAUDE.md and the root CLAUDE.md and `docs/VERIFIED_APIS.md`
2. Report back a plan — files it will touch, order, dependencies
3. STOP and wait for your approval

**Your job as the human:** review the plan before approving. Check four things:

1. Did Claude actually read the files? (The summary should reference specifics from CLAUDE.md, not generic paraphrases.)
2. Does it understand its scope boundary? (If Claude proposes touching another worker's directory, push back.)
3. Did it verify APIs against `docs/VERIFIED_APIS.md`? (Worker 1 should quote the TinyFish endpoint; Worker 4 should quote the ElevenLabs outbound-call path.)
4. Is the scope realistic for hour 0–4? (If it proposes 15 features in the first task, cut it back.)

If any check fails, redo the plan before letting it code. 5 minutes of review saves hours later.

## T+0:25 to T+0:30 — Sync up

Each worker in 60 seconds:
- What you're building first
- What fixture you'll ship by hour 4 so downstream can integrate
- Any blocker you see coming

Write the worker assignment in a pinned Discord/Slack message: `Worker 1 (scraper): Alice · Worker 2 (classifier): Bob · Worker 3 (web): Ritesh · Worker 4 (voice): Dave`.

## T+0:30 — Build

Checkpoints at hours 4, 12, 20. Commit every 30–60 min. Descope from `docs/TIMELINE.md` if behind.

---

## Critical practices for parallel Claude Code work

Full details in `docs/CLAUDE_CODE_PRACTICES.md`. The short version:

1. **One Claude Code session per worker, one VS Code window, one subdirectory.** Do not cross streams.
2. **Every new session starts with scope reminder.** "You are Worker N. You only modify files inside `<your path>/`. If you think a change outside your path is needed, stop and ask."
3. **Plan before coding, every task.** "Before writing any code, show me the files you'll create and the APIs you'll call. I'll approve before you code."
4. **Verify libraries don't hallucinate.** Before using any API, check `docs/VERIFIED_APIS.md` or fetch current docs. Never call a method from training data.
5. **Commit before risky operations.** Any refactor, install, or file move — `git commit` first so you can `git reset --hard` if it breaks.
6. **Pre-approve safe commands in `.claude/settings.local.json`** so Claude doesn't ask permission for every `pnpm test`:
   ```json
   {"permissions":{"allow":["Bash(pnpm:*)","Bash(git:status)","Bash(git:diff)","Bash(git:log)","Bash(node:*)","Bash(tsx:*)","Bash(rg:*)","Bash(grep:*)","Bash(ls:*)","Bash(cat:*)"]}}
   ```
7. **Ask Claude to explain when stuck, not to code harder.** "Don't fix this error, explain why it's happening." You'll diagnose faster and catch Claude's misunderstandings.
