# packages/classifier — Claude Classifier & Drafter

> **You are Worker 2.** Read order: `../../CLAUDE.md` → `../../docs/VERIFIED_APIS.md` (Anthropic section — memorize) → `../../docs/INTERFACES.md` → this file.

## What this package is

The Claude-powered classification layer. Reads `DisputeCandidate` objects, determines merit, drafts the dispute response text. Haiku 4.5 pre-filters cheap rejections; Sonnet 4.6 does the high-value drafts.

## Scope

**You modify:** `packages/classifier/**` only.
**You do not modify:** anything else. Types come from `@counter/types`.

## Public API

```typescript
// packages/classifier/src/index.ts

import type { DisputeCandidate, ClassifiedDispute } from "@counter/types";

export interface Classifier {
  classify(candidate: DisputeCandidate): Promise<ClassifiedDispute>;
  classifyMany(candidates: DisputeCandidate[]): Promise<ClassifiedDispute[]>;
}

export function createClassifier(opts: { anthropicApiKey: string }): Classifier;
export function createMockClassifier(): Classifier;
```

## Task order

### Task 1 — Scaffold + mock classifier (hour 2–3)

- `package.json` — `name: "@counter/classifier"`, deps: `@counter/types`, `@anthropic-ai/sdk`
- `src/index.ts` — factory exports
- `src/mock.ts` — `createMockClassifier` returning deterministic `ClassifiedDispute` per fixture ID (hand-written 30 entries — matches Worker 1's fixture IDs)
- `__fixtures__/classifications.json` — same data as mock, serializable
- `test/smoke.test.ts` — mock returns 30 classifications with varied merit scores

Mock classifications distribution:
- ~22 with `shouldDispute: true, meritScore >= 70` (these get auto-submitted in the demo)
- ~4 with `shouldDispute: true, meritScore 40–69` (human-review tier)
- ~4 with `shouldDispute: false` (e.g., customer_cancel after prep — merchant should eat it)

Recovery math: the 22 merit-worthy should total ~$892 recoverable. This is the demo number. Hand-tune amounts to land there.

Commit: `feat(classifier): scaffold with mock classifier`

### Task 2 — Schemas (hour 3–4)

`src/schemas.ts` — JSON Schema definitions for structured outputs. These are literal JSON Schema objects, not Zod schemas (the Anthropic API takes JSON Schema directly).

```typescript
export const CLASSIFIED_DISPUTE_SCHEMA = {
  type: "object",
  properties: {
    shouldDispute: { type: "boolean" },
    meritScore: { type: "integer", minimum: 0, maximum: 100 },
    reasoning: { type: "string", maxLength: 500 },
    resolvedChargeType: {
      type: "string",
      enum: ["missing_item", "wrong_item", "order_never_arrived", "cold_food", "customer_cancel", "unknown"],
    },
    recoverableCents: { type: "integer", minimum: 0 },
    draftedDisputeText: { type: "string", minLength: 50, maxLength: 1200 },
    evidenceCitations: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      maxItems: 5,
    },
  },
  required: ["shouldDispute", "meritScore", "reasoning", "resolvedChargeType", "recoverableCents", "draftedDisputeText", "evidenceCitations"],
  additionalProperties: false,
} as const;

export const PREFILTER_SCHEMA = {
  type: "object",
  properties: {
    worthDisputing: { type: "boolean" },
    quickReason: { type: "string", maxLength: 200 },
  },
  required: ["worthDisputing", "quickReason"],
  additionalProperties: false,
} as const;
```

### Task 3 — System prompts (hour 4–5)

`src/prompts.ts` — the core IP of this module. Prompt quality is scored, directly, by judges reading the drafted text.

```typescript
export const CLASSIFIER_SYSTEM_PROMPT = `
You are a dispute analyst for House of Curry, a small independent South Indian restaurant
in Minneapolis. You review automated charges that DoorDash has applied for customer
complaints (missing items, wrong items, etc.) and decide which ones to dispute.

Your job has two parts:

1. MERIT ANALYSIS. Decide whether this charge is worth disputing.
   - meritScore 90-100: Strong evidence the charge is incorrect. Clear grounds to dispute.
   - meritScore 70-89: Reasonable grounds to dispute; likely recoverable.
   - meritScore 40-69: Gray zone. Would recommend human review.
   - meritScore 0-39: Charge appears valid. Don't dispute.

   Use these signals:
   - Vague customer comments ("everything was bad", "old food") → lower merit
   - Specific claims ("item X missing") with no corroboration → medium merit
   - Claims contradicted by order data (e.g., "missing item" but receipt shows it wasn't ordered) → high merit
   - Claims about cold/late food when delivery time was normal → high merit dispute
   - Chronic complainers (customer with high refund frequency) → high merit
   - First-time customer, reasonable complaint → lower merit (don't fight a new customer)

2. DRAFTED RESPONSE. Write a 2–4 sentence dispute response that:
   - Leads with the strongest evidence
   - Cites specific data (POS record, timestamps, driver log)
   - Stays professional, never accusatory
   - Closes with a clear request ("reverse the charge" or "review the evidence")

   DO NOT:
   - Use templates or boilerplate phrases
   - Apologize or express uncertainty
   - Make claims you can't back with the provided evidence
   - Exceed 1200 characters
   - Repeat opening phrases across responses (vary sentence structure)
   - Sound like a customer service script

Always return valid JSON matching the schema. No commentary outside the JSON.
`.trim();

export const PREFILTER_SYSTEM_PROMPT = `
You are a fast pre-filter for a dispute classifier. Given a charge, decide if it's worth
spending expensive analysis on.

Return worthDisputing: true if ANY of:
- Customer comment is vague or contradicts itself
- Amount > $20
- Customer has a clear pattern of frivolous complaints
- Claims are specific enough to evaluate

Return worthDisputing: false if:
- Customer is demonstrably right (e.g., delivery never arrived, confirmed by driver log)
- Amount < $5 (not worth the time)
- Claim is a legitimate quality complaint on an item where quality is subjective

Return JSON only.
`.trim();
```

### Task 4 — Claude client with caching + structured outputs (hour 5–7)

`src/claude.ts` — the real Claude integration.

```typescript
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function classifyWithSonnet(
  candidate: DisputeCandidate,
  evidencePack: string
): Promise<ClassifiedDispute> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    output_config: {
      format: {
        type: "json_schema",
        schema: CLASSIFIED_DISPUTE_SCHEMA,
      },
    },
    system: [
      {
        type: "text",
        text: CLASSIFIER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },  // CACHE THE SYSTEM PROMPT
      },
    ],
    messages: [
      {
        role: "user",
        content: buildUserMessage(candidate, evidencePack),
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Sonnet returned no text content");

  const raw = JSON.parse(text) as Omit<ClassifiedDispute, "candidateId" | "generatedAt">;
  return {
    ...raw,
    candidateId: candidate.id,
    generatedAt: new Date().toISOString(),
  };
}

export async function prefilterWithHaiku(candidate: DisputeCandidate): Promise<{ worthDisputing: boolean; quickReason: string }> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    output_config: {
      format: { type: "json_schema", schema: PREFILTER_SCHEMA },
    },
    system: [
      {
        type: "text",
        text: PREFILTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: buildUserMessage(candidate, null) }],
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Haiku returned no text content");
  return JSON.parse(text);
}
```

Verification before coding: quote back to me the model IDs and the structured-output API syntax. If your memory says `claude-sonnet-4-7` or `tool_choice: {type: "tool"}`, the docs override you.

### Task 5 — Evidence packer (hour 7–8)

`src/evidence.ts` — assembles the evidence section of the user message.

For the hackathon, evidence is mocked. Given a `DisputeCandidate`, return a realistic evidence pack:

```typescript
export function buildEvidencePack(candidate: DisputeCandidate): string {
  return `
POS record for order ${candidate.orderId}:
  - ${candidate.itemsReported.map(i => `${i.quantity}× ${i.name}`).join("\n  - ")}
  - All items confirmed dispatched at ${pickupTime(candidate)}.

Driver log:
  - Accepted order at ${candidate.orderTimestamp}
  - Marked delivered at ${approximateDeliveryTime(candidate)}.
  - No redelivery requests.

Customer history (House of Curry loyalty):
  - ${customerHistorySnippet(candidate)}
  `.trim();
}
```

Hand-tune so evidence supports classifier outputs matching the expected demo numbers.

### Task 6 — Orchestration (hour 8–9)

`src/index.ts` ties it together:

```typescript
export function createClassifier({ anthropicApiKey }: { anthropicApiKey: string }): Classifier {
  process.env.ANTHROPIC_API_KEY = anthropicApiKey;

  return {
    async classify(candidate) {
      const prefilter = await prefilterWithHaiku(candidate);
      if (!prefilter.worthDisputing) {
        return buildSkippedClassification(candidate, prefilter.quickReason);
      }
      const evidence = buildEvidencePack(candidate);
      return classifyWithSonnet(candidate, evidence);
    },

    async classifyMany(candidates) {
      // 10-way concurrency using p-limit or a simple semaphore
      return pAll(
        candidates.map(c => () => this.classify(c)),
        { concurrency: CLASSIFIER_CONCURRENCY }
      );
    },
  };
}
```

### Task 7 — Prompt quality pass (hour 12–14)

**Ritesh reads 5 random outputs aloud.** If any feel robotic, templated, or generic, iterate the prompt. This is where the judges' experience is decided.

Signals of robotic output:
- "Thank you for your attention to this matter."
- "Please review the attached evidence."
- Identical sentence structures across disputes

Fix by adding to the system prompt:
- "Vary sentence structure. Do not repeat opening phrases across responses."
- "Sound like a small-business owner who's tired of losing money to this, not a customer service script."

## Verified Anthropic facts (quote back before coding)

From `docs/VERIFIED_APIS.md`:

- Sonnet model ID: `claude-sonnet-4-6` (NOT 4.7 — doesn't exist)
- Haiku model ID: `claude-haiku-4-5`
- Structured output: `output_config.format` with `type: "json_schema"` — use this, NOT the old `tool_choice: {type: "tool"}` hack
- Prompt caching: `cache_control: { type: "ephemeral" }` on the block you want cached; default TTL 5 min
- Cache reads: 0.1× cost and DON'T count toward ITPM rate limits (this is a ~10× throughput multiplier for us)
- Package: `@anthropic-ai/sdk`

## Exit criteria

- `pnpm -F @counter/classifier build` green
- `pnpm -F @counter/classifier test` green
- `createMockClassifier()` returns the 30 demo classifications deterministically
- `createClassifier()` calls real Claude and returns valid structured output for every fixture candidate
- Batch `classifyMany(30 candidates)` completes in under 8 seconds (target ~4.5s with 10-way concurrency)
- Drafted text reads human, not robotic

## Rules

1. **Use `output_config.format`, not `tool_choice`.** Structured outputs went GA early 2026; the old pattern still works but the new one is cleaner.
2. **Cache the system prompt from day one.** Don't wait until "if we have time." Caching is pure upside.
3. **Haiku 4.5 for pre-filter. Sonnet 4.6 for final draft.** Do not run every candidate through Sonnet.
4. **No Zod.** Anthropic takes JSON Schema directly; adding Zod is overhead with no payoff here.
5. **Imports from `@counter/types` only.** Never redefine `ClassifiedDispute`.
6. **No file modifications outside `packages/classifier/`.**
