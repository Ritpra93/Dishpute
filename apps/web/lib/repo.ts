import { getDb } from "./db";
import {
  CONTINGENCY_FEE_RATE,
  type ClassifiedDispute,
  type DashboardStats,
  type DisputeCandidate,
  type DisputeOutcome,
  type EnrichedDispute,
  type ErrorChargeType,
  type Platform,
  type SubmissionResult,
} from "./types";

interface CandidateRow {
  id: string;
  platform: string;
  order_id: string;
  charge_type: string;
  charge_amount_cents: number;
  items_reported_json: string;
  customer_comment: string | null;
  order_timestamp: string;
  charge_timestamp: string;
  dispute_deadline: string;
  portal_url: string;
  raw_text: string;
  scraped_at: string;
}

interface ClassificationRow {
  candidate_id: string;
  should_dispute: number;
  merit_score: number;
  reasoning: string;
  resolved_charge_type: string;
  recoverable_cents: number;
  drafted_dispute_text: string;
  evidence_citations_json: string;
  generated_at: string;
}

interface SubmissionRow {
  candidate_id: string;
  submitted_at: string;
  status: string;
  platform_confirmation_id: string | null;
  error_message: string | null;
}

interface OutcomeRow {
  candidate_id: string;
  outcome: string;
  refunded_cents: number;
  adjudicated_at: string | null;
  escalate_to_voice: number;
}

function rowToCandidate(r: CandidateRow): DisputeCandidate {
  return {
    id: r.id,
    platform: r.platform as Platform,
    orderId: r.order_id,
    chargeType: r.charge_type as ErrorChargeType,
    chargeAmountCents: r.charge_amount_cents,
    itemsReported: JSON.parse(r.items_reported_json),
    customerComment: r.customer_comment ?? undefined,
    orderTimestamp: r.order_timestamp,
    chargeTimestamp: r.charge_timestamp,
    disputeDeadline: r.dispute_deadline,
    portalUrl: r.portal_url,
    rawText: r.raw_text,
  };
}

function rowToClassification(r: ClassificationRow): ClassifiedDispute {
  return {
    candidateId: r.candidate_id,
    shouldDispute: r.should_dispute === 1,
    meritScore: r.merit_score,
    reasoning: r.reasoning,
    resolvedChargeType: r.resolved_charge_type as ErrorChargeType,
    recoverableCents: r.recoverable_cents,
    draftedDisputeText: r.drafted_dispute_text,
    evidenceCitations: JSON.parse(r.evidence_citations_json),
    generatedAt: r.generated_at,
  };
}

function rowToSubmission(r: SubmissionRow): SubmissionResult {
  return {
    candidateId: r.candidate_id,
    submittedAt: r.submitted_at,
    status: r.status as SubmissionResult["status"],
    platformConfirmationId: r.platform_confirmation_id ?? undefined,
    errorMessage: r.error_message ?? undefined,
  };
}

function rowToOutcome(r: OutcomeRow): DisputeOutcome {
  return {
    candidateId: r.candidate_id,
    outcome: r.outcome as DisputeOutcome["outcome"],
    refundedCents: r.refunded_cents,
    adjudicatedAt: r.adjudicated_at ?? undefined,
    escalateToVoice: r.escalate_to_voice === 1,
  };
}

// ─── Writes ────────────────────────────────────────────────────────────────

export function upsertCandidate(c: DisputeCandidate, scrapedAt = new Date().toISOString()) {
  getDb()
    .prepare(
      `INSERT INTO dispute_candidates (
        id, platform, order_id, charge_type, charge_amount_cents,
        items_reported_json, customer_comment, order_timestamp, charge_timestamp,
        dispute_deadline, portal_url, raw_text, scraped_at
      ) VALUES (
        @id, @platform, @order_id, @charge_type, @charge_amount_cents,
        @items_reported_json, @customer_comment, @order_timestamp, @charge_timestamp,
        @dispute_deadline, @portal_url, @raw_text, @scraped_at
      )
      ON CONFLICT(id) DO UPDATE SET
        platform=excluded.platform,
        order_id=excluded.order_id,
        charge_type=excluded.charge_type,
        charge_amount_cents=excluded.charge_amount_cents,
        items_reported_json=excluded.items_reported_json,
        customer_comment=excluded.customer_comment,
        order_timestamp=excluded.order_timestamp,
        charge_timestamp=excluded.charge_timestamp,
        dispute_deadline=excluded.dispute_deadline,
        portal_url=excluded.portal_url,
        raw_text=excluded.raw_text,
        scraped_at=excluded.scraped_at`
    )
    .run({
      id: c.id,
      platform: c.platform,
      order_id: c.orderId,
      charge_type: c.chargeType,
      charge_amount_cents: c.chargeAmountCents,
      items_reported_json: JSON.stringify(c.itemsReported),
      customer_comment: c.customerComment ?? null,
      order_timestamp: c.orderTimestamp,
      charge_timestamp: c.chargeTimestamp,
      dispute_deadline: c.disputeDeadline,
      portal_url: c.portalUrl,
      raw_text: c.rawText,
      scraped_at: scrapedAt,
    });
}

export function upsertClassification(c: ClassifiedDispute) {
  getDb()
    .prepare(
      `INSERT INTO classifications (
        candidate_id, should_dispute, merit_score, reasoning, resolved_charge_type,
        recoverable_cents, drafted_dispute_text, evidence_citations_json, generated_at
      ) VALUES (
        @candidate_id, @should_dispute, @merit_score, @reasoning, @resolved_charge_type,
        @recoverable_cents, @drafted_dispute_text, @evidence_citations_json, @generated_at
      )
      ON CONFLICT(candidate_id) DO UPDATE SET
        should_dispute=excluded.should_dispute,
        merit_score=excluded.merit_score,
        reasoning=excluded.reasoning,
        resolved_charge_type=excluded.resolved_charge_type,
        recoverable_cents=excluded.recoverable_cents,
        drafted_dispute_text=excluded.drafted_dispute_text,
        evidence_citations_json=excluded.evidence_citations_json,
        generated_at=excluded.generated_at`
    )
    .run({
      candidate_id: c.candidateId,
      should_dispute: c.shouldDispute ? 1 : 0,
      merit_score: c.meritScore,
      reasoning: c.reasoning,
      resolved_charge_type: c.resolvedChargeType,
      recoverable_cents: c.recoverableCents,
      drafted_dispute_text: c.draftedDisputeText,
      evidence_citations_json: JSON.stringify(c.evidenceCitations),
      generated_at: c.generatedAt,
    });
}

export function upsertSubmission(s: SubmissionResult) {
  getDb()
    .prepare(
      `INSERT INTO submissions (
        candidate_id, submitted_at, status, platform_confirmation_id, error_message
      ) VALUES (
        @candidate_id, @submitted_at, @status, @platform_confirmation_id, @error_message
      )
      ON CONFLICT(candidate_id) DO UPDATE SET
        submitted_at=excluded.submitted_at,
        status=excluded.status,
        platform_confirmation_id=excluded.platform_confirmation_id,
        error_message=excluded.error_message`
    )
    .run({
      candidate_id: s.candidateId,
      submitted_at: s.submittedAt,
      status: s.status,
      platform_confirmation_id: s.platformConfirmationId ?? null,
      error_message: s.errorMessage ?? null,
    });
}

export function upsertOutcome(o: DisputeOutcome) {
  getDb()
    .prepare(
      `INSERT INTO outcomes (
        candidate_id, outcome, refunded_cents, adjudicated_at, escalate_to_voice
      ) VALUES (
        @candidate_id, @outcome, @refunded_cents, @adjudicated_at, @escalate_to_voice
      )
      ON CONFLICT(candidate_id) DO UPDATE SET
        outcome=excluded.outcome,
        refunded_cents=excluded.refunded_cents,
        adjudicated_at=excluded.adjudicated_at,
        escalate_to_voice=excluded.escalate_to_voice`
    )
    .run({
      candidate_id: o.candidateId,
      outcome: o.outcome,
      refunded_cents: o.refundedCents,
      adjudicated_at: o.adjudicatedAt ?? null,
      escalate_to_voice: o.escalateToVoice ? 1 : 0,
    });
}

// ─── Reads ─────────────────────────────────────────────────────────────────

export function getCandidate(id: string): DisputeCandidate | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM dispute_candidates WHERE id = ?`)
    .get(id) as CandidateRow | undefined;
  return row ? rowToCandidate(row) : undefined;
}

export function getClassification(id: string): ClassifiedDispute | undefined {
  const row = getDb()
    .prepare(`SELECT * FROM classifications WHERE candidate_id = ?`)
    .get(id) as ClassificationRow | undefined;
  return row ? rowToClassification(row) : undefined;
}

export function listEnrichedDisputes(): EnrichedDispute[] {
  const candidates = getDb()
    .prepare(`SELECT * FROM dispute_candidates ORDER BY charge_timestamp DESC`)
    .all() as CandidateRow[];

  if (candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);
  const placeholders = ids.map(() => "?").join(",");

  const classifications = (
    getDb()
      .prepare(`SELECT * FROM classifications WHERE candidate_id IN (${placeholders})`)
      .all(...ids) as ClassificationRow[]
  ).reduce<Record<string, ClassifiedDispute>>((acc, r) => {
    acc[r.candidate_id] = rowToClassification(r);
    return acc;
  }, {});

  const submissions = (
    getDb()
      .prepare(`SELECT * FROM submissions WHERE candidate_id IN (${placeholders})`)
      .all(...ids) as SubmissionRow[]
  ).reduce<Record<string, SubmissionResult>>((acc, r) => {
    acc[r.candidate_id] = rowToSubmission(r);
    return acc;
  }, {});

  const outcomes = (
    getDb()
      .prepare(`SELECT * FROM outcomes WHERE candidate_id IN (${placeholders})`)
      .all(...ids) as OutcomeRow[]
  ).reduce<Record<string, DisputeOutcome>>((acc, r) => {
    acc[r.candidate_id] = rowToOutcome(r);
    return acc;
  }, {});

  return candidates.map((row) => {
    const candidate = rowToCandidate(row);
    return {
      ...candidate,
      classification: classifications[candidate.id],
      submission: submissions[candidate.id],
      outcome: outcomes[candidate.id],
    };
  });
}

export function listSubmittableClassifications(minMeritScore: number): ClassifiedDispute[] {
  return (
    getDb()
      .prepare(
        `SELECT c.* FROM classifications c
         WHERE c.should_dispute = 1
           AND c.merit_score >= ?
           AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.candidate_id = c.candidate_id)`
      )
      .all(minMeritScore) as ClassificationRow[]
  ).map(rowToClassification);
}

export function computeStats(): DashboardStats {
  const db = getDb();

  const totalCharges =
    (db.prepare(`SELECT COUNT(*) AS n FROM dispute_candidates`).get() as { n: number }).n;

  const totalDisputed =
    (db.prepare(`SELECT COUNT(*) AS n FROM submissions WHERE status = 'submitted'`).get() as {
      n: number;
    }).n;

  const sum = (sql: string): number =>
    (db.prepare(sql).get() as { cents: number }).cents;

  const totalSubmittedRecoverableCents = sum(
    `SELECT COALESCE(SUM(c.recoverable_cents), 0) AS cents
     FROM submissions s
     JOIN classifications c ON c.candidate_id = s.candidate_id
     WHERE s.status = 'submitted'`
  );

  const totalRealizedCents =
    sum(
      `SELECT COALESCE(SUM(o.refunded_cents), 0) AS cents
       FROM outcomes o
       WHERE o.outcome = 'approved'`
    ) +
    sum(
      `SELECT COALESCE(SUM(v.recovered_cents), 0) AS cents
       FROM voice_calls v
       WHERE v.call_outcome = 'recovered'`
    );

  const totalInFlightCents = sum(
    `SELECT COALESCE(SUM(c.recoverable_cents), 0) AS cents
     FROM submissions s
     JOIN classifications c ON c.candidate_id = s.candidate_id
     JOIN outcomes o ON o.candidate_id = s.candidate_id
     WHERE s.status = 'submitted' AND o.outcome = 'pending'`
  );

  const totalDeniedCents = sum(
    `SELECT COALESCE(SUM(c.recoverable_cents), 0) AS cents
     FROM submissions s
     JOIN classifications c ON c.candidate_id = s.candidate_id
     JOIN outcomes o ON o.candidate_id = s.candidate_id
     WHERE s.status = 'submitted' AND o.outcome = 'denied'`
  );

  return {
    totalCharges,
    totalDisputed,
    totalSubmittedRecoverableCents,
    totalRealizedCents,
    totalInFlightCents,
    totalDeniedCents,
    counterFeeCents: Math.round(totalRealizedCents * CONTINGENCY_FEE_RATE),
  };
}

// ─── Reset (used by seed script) ───────────────────────────────────────────

export function resetAllTables() {
  const db = getDb();
  const tx = db.transaction(() => {
    db.exec(`DELETE FROM voice_calls;`);
    db.exec(`DELETE FROM outcomes;`);
    db.exec(`DELETE FROM submissions;`);
    db.exec(`DELETE FROM classifications;`);
    db.exec(`DELETE FROM dispute_candidates;`);
  });
  tx();
}
