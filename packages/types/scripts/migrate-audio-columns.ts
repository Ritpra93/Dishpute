#!/usr/bin/env tsx
/**
 * Idempotent migration: adds audio_path + audio_fetched_at columns to voice_calls.
 * Safe to run multiple times — checks PRAGMA table_info before ALTER.
 *
 * Usage: pnpm migrate   (from repo root)
 */
import Database from "better-sqlite3";
import path from "node:path";

const dbPath = process.env["DB_PATH"] ?? path.join(__dirname, "../../../counter.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const columns = db
  .prepare("PRAGMA table_info(voice_calls)")
  .all() as Array<{ name: string }>;

// If voice_calls table doesn't exist yet, the schema.sql CREATE TABLE
// already includes the new columns — nothing to migrate.
if (columns.length === 0) {
  console.log("[migrate] voice_calls table does not exist yet — schema.sql will create it with audio columns. Done.");
  db.close();
  process.exit(0);
}

const existing = new Set(columns.map((c) => c.name));

if (!existing.has("audio_path")) {
  db.exec("ALTER TABLE voice_calls ADD COLUMN audio_path TEXT");
  console.log("[migrate] Added audio_path column to voice_calls");
} else {
  console.log("[migrate] audio_path already exists — skipping");
}

if (!existing.has("audio_fetched_at")) {
  db.exec("ALTER TABLE voice_calls ADD COLUMN audio_fetched_at TEXT");
  console.log("[migrate] Added audio_fetched_at column to voice_calls");
} else {
  console.log("[migrate] audio_fetched_at already exists — skipping");
}

db.close();
console.log("[migrate] Done.");
