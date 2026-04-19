import { getDb } from "@/lib/db";

export interface RecoveredTransfer {
  id: string;
  candidateId: string | null;
  amountCents: number;
  currency: string;
  destination: string | null;
  arrivedAt: string;
  livemode: boolean;
  rawEventId: string;
}

interface Row {
  id: string;
  candidate_id: string | null;
  amount_cents: number;
  currency: string;
  destination: string | null;
  arrived_at: string;
  livemode: number;
  raw_event_id: string;
}

function toModel(r: Row): RecoveredTransfer {
  return {
    id: r.id,
    candidateId: r.candidate_id,
    amountCents: r.amount_cents,
    currency: r.currency,
    destination: r.destination,
    arrivedAt: r.arrived_at,
    livemode: r.livemode === 1,
    rawEventId: r.raw_event_id,
  };
}

export interface InsertTransferInput {
  id: string;
  candidateId?: string | null;
  amountCents: number;
  currency: string;
  destination?: string | null;
  arrivedAt: string;
  livemode: boolean;
  rawEventId: string;
  rawPayload: unknown;
}

/**
 * Idempotent insert keyed on Stripe event id. Returns the persisted transfer
 * if it was newly inserted, or `null` if it was a duplicate event.
 */
export function insertTransfer(input: InsertTransferInput): RecoveredTransfer | null {
  const result = getDb()
    .prepare(
      `INSERT OR IGNORE INTO recovered_transfers
        (id, candidate_id, amount_cents, currency, destination, arrived_at, livemode, raw_event_id, raw_payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.candidateId ?? null,
      input.amountCents,
      input.currency,
      input.destination ?? null,
      input.arrivedAt,
      input.livemode ? 1 : 0,
      input.rawEventId,
      JSON.stringify(input.rawPayload)
    );

  if (result.changes === 0) return null;

  const row = getDb()
    .prepare(`SELECT * FROM recovered_transfers WHERE id = ?`)
    .get(input.id) as Row | undefined;
  return row ? toModel(row) : null;
}

export function listTransfersToday(): RecoveredTransfer[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = getDb()
    .prepare(
      `SELECT * FROM recovered_transfers
       WHERE arrived_at >= ?
       ORDER BY arrived_at DESC`
    )
    .all(today.toISOString()) as Row[];
  return rows.map(toModel);
}

export function sumRecoveredTodayCents(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount_cents), 0) AS total
       FROM recovered_transfers
       WHERE arrived_at >= ?`
    )
    .get(today.toISOString()) as { total: number };
  return row.total;
}
