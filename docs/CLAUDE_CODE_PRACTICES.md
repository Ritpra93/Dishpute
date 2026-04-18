# Claude Code Practices — How 4 People Build in Parallel Without Collisions

> **For every worker:** read this before opening Claude Code. These practices are the difference between shipping a working demo at hour 24 and pulling an all-nighter fixing merge conflicts.

## Core principle

Claude Code is powerful, but it has no awareness of what your teammates are doing. The human is the integrator, the reviewer, and the scope enforcer. Claude codes; you steer.

## The 10 practices

### 1. One Claude Code session per worker. One VS Code window. One subdirectory.

Open VS Code at `packages/scraper/` — NOT at the repo root. Launch Claude Code from there. This focuses Claude's context window on files in your lane. Opening at repo root causes three failure modes:

- Tokens wasted on files you don't care about
- Claude tempted to edit files outside your ownership
- Longer read cycles slow iteration

If you need to reference a file outside your directory (e.g., `packages/types/src/index.ts`), Claude can still read it via relative path. It just won't be in its default search scope.

### 2. Start every session with scope discipline

When you open a new Claude Code conversation, make the first message include:

> You are Worker N (scraper/classifier/web/voice). You only modify files inside `<your path>/`. If you believe a change outside your path is required, stop and tell me — I'll coordinate with the owner. Do not edit `packages/types/` without explicit approval.

This single sentence prevents ~80% of the cross-worker file collisions you'd otherwise hit.

### 3. Plan before coding, every task

Every new task, the flow is:

1. You: "Task X from my CLAUDE.md. Before coding, tell me: which files you'll create or modify, what APIs you'll call, what dependencies you'll add."
2. Claude: responds with a plan.
3. You: review. Push back on anything wrong. Approve or redirect.
4. Claude: codes.
5. You: review the code (diff in git, run tests, actually look at the output).
6. Commit.

Skipping step 1 is how you end up with 400 lines of code that solves the wrong problem.

### 4. Verify APIs — never code from memory

Before writing code that calls TinyFish, ElevenLabs, Anthropic, or any other external service, either:

- Reference `docs/VERIFIED_APIS.md` (the source of truth for this project), or
- Fetch the live documentation

**Do not let Claude code from its training data for third-party APIs.** Claude's training data for TinyFish is months out of date; it will invent method names. Same for ElevenLabs (recently rebranded), Next.js 16 (new architecture), and `motion` (the Framer Motion rename).

The explicit test: if Claude writes code calling `tinyfishClient.runTask()`, stop it. That method doesn't exist. The real API is `fetch('https://agent.tinyfish.ai/v1/automation/run-sse', ...)` with `X-API-Key`. It's in `docs/VERIFIED_APIS.md` for a reason.

### 5. Commit before anything risky

Before asking Claude Code to do any of these, `git commit` first:

- Installing a dependency
- Refactoring across 3+ files
- Moving or renaming files
- Running a migration script

If the operation goes wrong, `git reset --hard HEAD` recovers instantly. If you didn't commit, you're stuck manually reverting.

### 6. Pre-approve safe commands

Put this in `.claude/settings.local.json` at your worker directory so Claude stops asking permission for every `pnpm test`:

```json
{
  "permissions": {
    "allow": [
      "Bash(pnpm:*)",
      "Bash(git:status)",
      "Bash(git:diff)",
      "Bash(git:log)",
      "Bash(git:add:*)",
      "Bash(git:commit:*)",
      "Bash(git:branch:*)",
      "Bash(git:checkout:*)",
      "Bash(node:*)",
      "Bash(tsx:*)",
      "Bash(rg:*)",
      "Bash(grep:*)",
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(mkdir:*)"
    ]
  }
}
```

Does NOT include destructive commands (`rm`, `git reset`, `git push --force`). You approve those manually.

This file is in `.gitignore` — don't commit your local settings.

### 7. When stuck, ask Claude to explain — not to code harder

If you're chasing a bug and Claude keeps proposing fixes that don't work, stop. Say:

> Don't write any code. Explain to me why this error is happening. Walk through the call path. Where could the bad value originate?

You'll catch Claude's misunderstandings faster this way. Often the bug is that Claude misread an API — forcing a written explanation exposes that.

### 8. Commit every 30–60 minutes with conventional messages

Short-lived branches are fine, but don't sit on one for 6 hours. Small commits make debugging easier and merges safer.

Message format: `feat(scraper): list open disputes`, `fix(web): dollar counter animation`, `chore: bump tinyfish client timeout`, `docs: note eleven labs gotcha`.

### 9. Integration tests before integration

Every module ships a `test/smoke.test.ts` that exercises its own public API against fixtures. Before wiring two modules together, run both smoke tests. Saves hours at hour 18 when things mysteriously don't compose.

### 10. Talk to your teammates like humans, not just to Claude

The team chat (Discord/Slack) exists for:
- "I'm about to change `DisputeCandidate` to add a `customerPhone` field — Worker 2, OK?"
- "Hit a TinyFish rate limit issue at hour 6 — workaround is X"
- "Pushing `scraper v0.2` now, integrates with classifier — pull and test"

Claude Code can't coordinate across sessions. You have to.

---

## A few tactical Claude Code tips for this project

### Reading docs inside a session

If Claude needs current API docs, prompt: "Fetch https://docs.tinyfish.ai/faq and summarize the rate limit section. Don't write code yet."

### Forcing a file-by-file review

After Claude claims it finished a task: "Run `git diff` and walk me through every changed file — what the change does, why. Don't gloss over anything."

### Debugging compiled output

"Run `pnpm -F @counter/scraper build`. If it fails, paste the full error. Don't try to fix yet — just show me."

### Keeping Claude focused

If Claude starts suggesting features you didn't ask for: "That's out of scope for this task. Add it to `TODO.md` if you think it's important. Stick to what I asked."

---

## What Claude Code is bad at

Know these limits so you don't hit them at hour 20:

1. **Novel API integration without docs** — without `docs/VERIFIED_APIS.md`, it hallucinates method names. Always feed it verified references.
2. **Multi-file refactors across the whole repo** — it works in its subdirectory. Cross-directory coordination is your job.
3. **UX polish** — Claude can build a working dashboard, but the visual judgment ("does this feel fast, does this feel confident") is yours. Review animations, spacing, typography as a human.
4. **Remembering context across sessions** — every new conversation is fresh. The CLAUDE.md files exist for exactly this reason. If you realize something important mid-session, write it into the CLAUDE.md so the next session inherits it.

---

## Emergency protocol

**If Claude Code breaks something catastrophically:**

1. `git status` — see what changed
2. `git diff` — inspect the damage
3. `git stash` or `git reset --hard <last-good-commit>` — restore
4. Tell the team in chat before retrying

**If you hit a Claude.ai usage limit mid-hackathon:**

- Claude Code on Pro has message-based limits that reset regularly
- If you're temporarily rate-limited, switch to reading existing code, writing docs, or testing by hand until limit resets
- Fallback: ask a teammate whose limit hasn't reset to help with one task
- Absolute fallback: use the shared Anthropic API key with the CLI-only Claude Code flow (slower, but works)
