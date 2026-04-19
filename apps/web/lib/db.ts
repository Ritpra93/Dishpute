import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { ensureVoiceCallsAudioColumns } from "@counter/types";

// Shared DB lives at the repo root — apps/web and apps/voice BOTH point here
// so voice-call records land in the same SQLite file the dashboard reads.
// Override via DB_PATH env var (used by integration tests).
const REPO_ROOT = path.join(process.cwd(), "..", "..");
const DB_PATH = process.env["DB_PATH"] ?? path.join(REPO_ROOT, "counter.db");

// Canonical schema lives in @counter/types — one source of truth.
const SCHEMA_PATH = path.join(REPO_ROOT, "packages", "types", "schema.sql");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
    db.exec(schema);
    ensureVoiceCallsAudioColumns(db);

    const row = db.prepare("SELECT COUNT(*) as n FROM dispute_candidates").get() as { n: number };
    if (row.n === 0) {
      console.warn("[db] dispute_candidates is empty — run `pnpm seed` to populate demo data.");
    }
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
