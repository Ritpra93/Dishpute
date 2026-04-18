# Interfaces — Shared Contracts

These are the frozen contracts. They live at `packages/types/src/index.ts` once set up. After hour 2 of the hackathon, these do not change without explicit team coordination.

Every worker consumes these. If one person renames `DisputeCandidate.rawText`, four Claude Code sessions break.

---

## Core domain types

```typescript
// packages/types/src/index.ts

export type Platform = 'doordash' | 'ubereats' | 'grubhub';

export type ErrorChargeType =
  | 'missing_item'        // customer reported item not in bag
  | 'wrong_item'          // customer reported wrong item delivered
  | 'order_never_arrived' // delivery failure charged to merchant
  | 'cold_food'           // quality complaint
  | 'customer_cancel'     // customer cancel after prep
  | 'unknown';

/**
 * Raw charge scraped from the merchant portal BEFORE classification.
 * Owned by: packages/scraper
 * Consumed by: packages/classifier, apps/web
 */
export interface DisputeCandidate {
  id: string;                    // portal's unique charge ID
  platform: Platform;
  orderId: string;               // merchant's order reference
  chargeType: ErrorChargeType;   // best-effort from portal labels; classifier may override
  chargeAmountCents: number;     // what the platform deducted
  itemsReported: Array<{
    name: string;
    quantity: number;
    refundAmountCents: number;
  }>;
  customerComment?: string;      // free text from customer, if provided
  orderTimestamp: string;        // ISO 8601
  chargeTimestamp: string;       // ISO 8601
  disputeDeadline: string;       // ISO 8601, 14 days after charge
  portalUrl: string;             // deep link back to the dispute in the mock portal
  rawText: string;               // full scraped text for the classifier to read
}

/**
 * Classifier output: merit score + drafted dispute.
 * Owned by: packages/classifier
 * Consumed by: apps/web (display), packages/scraper (submit)
 */
export interface ClassifiedDispute {
  candidateId: string;
  shouldDispute: boolean;
  meritScore: number;            // 0–100
  reasoning: string;             // 1–3 sentences, surfaced in UI
  resolvedChargeType: ErrorChargeType;
  recoverableCents: number;
  draftedDisputeText: string;    // ready-to-submit dispute body
  evidenceCitations: string[];   // e.g. ["POS record for order 4472 shows 3 items dispatched", "Driver pickup photo at 19:42"]
  generatedAt: string;           // ISO 8601
}

/**
 * Result of actually submitting to the portal.
 * Owned by: packages/scraper
 * Consumed by: apps/web, apps/voice (for escalation triggers)
 */
export interface SubmissionResult {
  candidateId: string;
  submittedAt: string;
  status: 'submitted' | 'platform_rejected_at_submit' | 'error';
  platformConfirmationId?: string;
  errorMessage?: string;
}

/**
 * After the platform adjudicates (or we scrape back the status).
 * Triggers voice escalation if denied.
 */
export interface DisputeOutcome {
  candidateId: string;
  outcome: 'approved' | 'denied' | 'pending';
  refundedCents: number;         // 0 if denied or pending
  adjudicatedAt?: string;
  escalateToVoice: boolean;      // true if denied AND meritScore >= 70
}

/**
 * Voice escalation record. Owned by apps/voice.
 */
export interface VoiceCallRecord {
  candidateId: string;
  elevenLabsConversationId: string;
  twilioCallSid: string;
  startedAt: string;
  endedAt?: string;
  transcript?: Array<{
    role: 'agent' | 'user';
    message: string;
    timeInCallSecs: number;
  }>;
  callOutcome?: 'recovered' | 'still_denied' | 'callback_requested';
  recoveredCents?: number;
}
```

---

## REST API contracts

### `apps/web` endpoints (consumed by the browser UI)

```typescript
// GET /api/disputes
// Returns the enriched dispute list for the dashboard.
// Each row includes classification + submission + outcome if available.
type GetDisputesResponse = Array<
  DisputeCandidate & {
    classification?: ClassifiedDispute;
    submission?: SubmissionResult;
    outcome?: DisputeOutcome;
  }
>;

// POST /api/scan
// Kicks off a scrape + classify via packages/scraper + packages/classifier.
// Body: { platform: Platform }
// Returns: { jobId: string, totalFound: number }

// POST /api/disputes/:id/submit
// Submits a single classified dispute via packages/scraper.
// Returns: SubmissionResult

// POST /api/disputes/submit-all
// Body: { minMeritScore?: number }  // default 70
// Submits every classified dispute above the threshold.
// Returns: { submitted: SubmissionResult[] }

// POST /api/disputes/:id/escalate
// Fires a voice call via apps/voice.
// Returns: { conversationId: string }

// GET /api/stats
// Returns: {
//   totalCharges: number,
//   totalDisputed: number,
//   totalRecoveredCents: number,
//   totalPendingCents: number,
//   counterFeeCents: number  // 20% of totalRecoveredCents
// }

// GET /api/trust
// Returns the mocked Vanta trust-center data for the /trust page.
// Rendered in apps/voice (or proxied) — see docs/VERIFIED_APIS.md Vanta section.
```

### `apps/voice` endpoints

```typescript
// POST /calls/outbound
// Body: {
//   candidateId: string,
//   phoneNumber: string,  // support line to call
//   context: ClassifiedDispute & { outcome: DisputeOutcome }
// }
// Initiates an ElevenLabs + Twilio outbound call.
// Returns: VoiceCallRecord (status: started)

// POST /tools/lookup_case
// Called by the ElevenLabs agent during a live call (function-calling webhook).
// Body: { caseId: string }
// Returns: { caseNumber, merchantName, chargeAmount, denialReason, evidenceSummary }

// POST /tools/reference_evidence
// Called by the agent during a call.
// Body: { caseId: string }
// Returns: { citations: string[] }

// POST /tools/escalate_to_supervisor
// Called by the agent during a call when the first-line rep can't help.
// Body: { reason: string, caseId: string }
// Returns: { escalationTicketId: string, message: string }

// POST /webhooks/elevenlabs/post-call
// ElevenLabs signed webhook with transcript + analysis.
// Updates the VoiceCallRecord. Uses Claude to parse transcript into an outcome.

// GET /api/vanta/trust-center
// Returns mocked Vanta data. See docs/VERIFIED_APIS.md.
```

---

## Database schema

```sql
-- packages/types/schema.sql
-- Seeded at startup by apps/web/lib/db.ts

CREATE TABLE IF NOT EXISTS dispute_candidates (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  order_id TEXT NOT NULL,
  charge_type TEXT NOT NULL,
  charge_amount_cents INTEGER NOT NULL,
  items_reported_json TEXT NOT NULL,      -- JSON-encoded array
  customer_comment TEXT,
  order_timestamp TEXT NOT NULL,
  charge_timestamp TEXT NOT NULL,
  dispute_deadline TEXT NOT NULL,
  portal_url TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  scraped_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS classifications (
  candidate_id TEXT PRIMARY KEY REFERENCES dispute_candidates(id),
  should_dispute INTEGER NOT NULL,        -- 0 or 1
  merit_score INTEGER NOT NULL,
  reasoning TEXT NOT NULL,
  resolved_charge_type TEXT NOT NULL,
  recoverable_cents INTEGER NOT NULL,
  drafted_dispute_text TEXT NOT NULL,
  evidence_citations_json TEXT NOT NULL,
  generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  candidate_id TEXT PRIMARY KEY REFERENCES dispute_candidates(id),
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL,
  platform_confirmation_id TEXT,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS outcomes (
  candidate_id TEXT PRIMARY KEY REFERENCES dispute_candidates(id),
  outcome TEXT NOT NULL,
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  adjudicated_at TEXT,
  escalate_to_voice INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS voice_calls (
  candidate_id TEXT NOT NULL REFERENCES dispute_candidates(id),
  eleven_labs_conversation_id TEXT NOT NULL,
  twilio_call_sid TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  transcript_json TEXT,
  call_outcome TEXT,
  recovered_cents INTEGER,
  PRIMARY KEY (candidate_id, eleven_labs_conversation_id)
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_disputes_by_deadline ON dispute_candidates(dispute_deadline);
CREATE INDEX IF NOT EXISTS idx_outcomes_by_escalate ON outcomes(escalate_to_voice);
```

---

## Fixture data format

Every worker ships fixtures so downstream can build offline. Place in your module's `__fixtures__/` folder.

- `packages/scraper/__fixtures__/doordash-disputes.json` — array of 30 realistic `DisputeCandidate`
- `packages/classifier/__fixtures__/classifications.json` — array of 30 `ClassifiedDispute` keyed by candidateId
- `apps/voice/__fixtures__/call-transcripts.json` — 3 sample `VoiceCallRecord` with full transcripts

The classifier ships two factories:
- `createClassifier(opts)` — real, calls Claude
- `createMockClassifier()` — deterministic, instant, for dev loop and demo fallback

Same pattern for the scraper:
- `createScraper(opts)` — real, calls TinyFish
- `createMockScraper()` — returns fixtures with simulated latency

Env var `SCRAPER_MODE=cache` makes the dashboard use mock scraper + classifier — the demo-day safety net.
