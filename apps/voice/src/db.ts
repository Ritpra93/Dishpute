import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Shared DB with apps/web — both point at the same counter.db at repo root.
    const dbPath =
      process.env["DB_PATH"] ??
      path.join(__dirname, "../../../counter.db");

    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");

    // Always apply schema — uses CREATE TABLE IF NOT EXISTS so it's a no-op
    // when tables already exist. This also recovers from a 0-byte DB file
    // left behind by a crashed init.
    const schema = fs.readFileSync(
      path.join(__dirname, "../../../packages/types/schema.sql"),
      "utf-8"
    );
    db.exec(schema);
  }
  return db;
}

export interface VoiceCallRow {
  candidate_id: string;
  eleven_labs_conversation_id: string;
  twilio_call_sid: string;
  started_at: string;
  ended_at: string | null;
  transcript_json: string | null;
  call_outcome: string | null;
  recovered_cents: number | null;
}

export function listVoiceCalls(): VoiceCallRow[] {
  return getDb()
    .prepare(`SELECT * FROM voice_calls ORDER BY started_at DESC`)
    .all() as VoiceCallRow[];
}

export function getLatestVoiceCall(candidateId: string): VoiceCallRow | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM voice_calls WHERE candidate_id = ?
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(candidateId) as VoiceCallRow | undefined;
}

export interface CandidateLookupRow {
  charge_amount_cents: number;
  charge_type: string;
  recoverable_cents: number | null;
  reasoning: string | null;
  drafted_dispute_text: string | null;
}

export function getCandidateWithClassification(
  candidateId: string
): CandidateLookupRow | undefined {
  return getDb()
    .prepare(
      `SELECT dc.charge_amount_cents, dc.charge_type,
              cl.recoverable_cents, cl.reasoning, cl.drafted_dispute_text
       FROM dispute_candidates dc
       LEFT JOIN classifications cl ON cl.candidate_id = dc.id
       WHERE dc.id = ?`
    )
    .get(candidateId) as CandidateLookupRow | undefined;
}

export function upsertVoiceCall(record: {
  candidateId: string;
  elevenLabsConversationId: string;
  twilioCallSid: string;
  startedAt: string;
  endedAt?: string;
  transcriptJson?: string;
  callOutcome?: string;
  recoveredCents?: number;
}): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO voice_calls (
      candidate_id, eleven_labs_conversation_id, twilio_call_sid,
      started_at, ended_at, transcript_json, call_outcome, recovered_cents
    ) VALUES (
      @candidateId, @elevenLabsConversationId, @twilioCallSid,
      @startedAt, @endedAt, @transcriptJson, @callOutcome, @recoveredCents
    )
    ON CONFLICT(candidate_id, eleven_labs_conversation_id) DO UPDATE SET
      ended_at = excluded.ended_at,
      transcript_json = excluded.transcript_json,
      call_outcome = excluded.call_outcome,
      recovered_cents = excluded.recovered_cents`
  ).run({
    candidateId: record.candidateId,
    elevenLabsConversationId: record.elevenLabsConversationId,
    twilioCallSid: record.twilioCallSid,
    startedAt: record.startedAt,
    endedAt: record.endedAt ?? null,
    transcriptJson: record.transcriptJson ?? null,
    callOutcome: record.callOutcome ?? null,
    recoveredCents: record.recoveredCents ?? null,
  });
}
