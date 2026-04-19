import { getDb } from "./db";
import type {
  DisplayCallRecord,
  CallOutcome,
  TranscriptTurn,
} from "@counter/types";

interface VoiceCallJoinRow {
  candidate_id: string;
  eleven_labs_conversation_id: string;
  started_at: string;
  ended_at: string | null;
  transcript_json: string | null;
  call_outcome: string | null;
  recovered_cents: number | null;
  audio_path: string | null;
  order_id: string | null;
}

function formatTimestamp(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function mapOutcome(row: VoiceCallJoinRow): CallOutcome {
  if (!row.ended_at) return "live";
  switch (row.call_outcome) {
    case "recovered":
      return "recovered";
    case "still_denied":
      return "still_denied";
    case "callback_requested":
      return "callback";
    default:
      return "still_denied";
  }
}

function parseTranscript(json: string | null): TranscriptTurn[] {
  if (!json) return [];
  try {
    const turns = JSON.parse(json) as Array<{
      role: string;
      message: string;
      timeInCallSecs: number;
    }>;
    return turns.map((t) => ({
      ts: formatTimestamp(t.timeInCallSecs),
      role: t.role === "agent" ? "agent" as const : t.role === "tool" ? "tool" as const : "rep" as const,
      text: t.message,
    }));
  } catch {
    return [];
  }
}

export function listVoiceCallsForDisplay(): DisplayCallRecord[] {
  const rows = getDb()
    .prepare(
      `SELECT vc.candidate_id, vc.eleven_labs_conversation_id,
              vc.started_at, vc.ended_at, vc.transcript_json,
              vc.call_outcome, vc.recovered_cents, vc.audio_path,
              dc.order_id
       FROM voice_calls vc
       LEFT JOIN dispute_candidates dc ON dc.id = vc.candidate_id
       ORDER BY vc.started_at DESC`
    )
    .all() as VoiceCallJoinRow[];

  return rows.map((row) => {
    const outcome = mapOutcome(row);
    const startMs = new Date(row.started_at).getTime();
    const endMs = row.ended_at ? new Date(row.ended_at).getTime() : Date.now();
    const durationSec = Math.round((endMs - startMs) / 1000);

    return {
      id: row.eleven_labs_conversation_id,
      disputeId: row.candidate_id,
      orderId: row.order_id ?? row.candidate_id,
      startedAt: row.started_at,
      durationSec,
      outcome,
      recovered: (row.recovered_cents ?? 0) / 100,
      toolsUsed: [], // TODO: extract from transcript tool turns when webhook persists tool_calls
      transcript: parseTranscript(row.transcript_json),
      audioAvailable: row.audio_path !== null,
    };
  });
}
