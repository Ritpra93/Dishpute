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

-- Stripe Connect recovered-funds ledger. Populated by the
-- /api/stripe/webhook handler on `transfer.created` (W8).
CREATE TABLE IF NOT EXISTS recovered_transfers (
  id TEXT PRIMARY KEY,                  -- Stripe transfer id (tr_...)
  candidate_id TEXT,                    -- nullable — not every transfer maps to a dispute
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  destination TEXT,                     -- destination connected account
  arrived_at TEXT NOT NULL,
  livemode INTEGER NOT NULL DEFAULT 0,
  raw_event_id TEXT NOT NULL UNIQUE,
  raw_payload_json TEXT NOT NULL
);

-- Indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_disputes_by_deadline ON dispute_candidates(dispute_deadline);
CREATE INDEX IF NOT EXISTS idx_outcomes_by_escalate ON outcomes(escalate_to_voice);
CREATE INDEX IF NOT EXISTS idx_recovered_transfers_arrived ON recovered_transfers(arrived_at);
