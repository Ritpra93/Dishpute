/**
 * Older counter.db files may lack audio columns; CREATE TABLE IF NOT EXISTS
 * does not ALTER existing tables. Safe to run on every DB open.
 */
export function ensureVoiceCallsAudioColumns(db: {
  prepare: (sql: string) => { all: () => unknown[] };
  exec: (sql: string) => void;
}): void {
  try {
    const rows = db
      .prepare("PRAGMA table_info(voice_calls)")
      .all() as { name: string }[];
    if (rows.length === 0) return;
    const names = new Set(rows.map((r) => r.name));
    if (!names.has("audio_path")) {
      db.exec("ALTER TABLE voice_calls ADD COLUMN audio_path TEXT");
    }
    if (!names.has("audio_fetched_at")) {
      db.exec("ALTER TABLE voice_calls ADD COLUMN audio_fetched_at TEXT");
    }
  } catch {
    // voice_calls may not exist yet
  }
}
