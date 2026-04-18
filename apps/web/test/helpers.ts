/**
 * Shared test utilities for apps/web integration tests.
 *
 * Each test file imports this BEFORE any app modules so the DB_PATH env var
 * is applied before better-sqlite3 opens a connection. (The real path is
 * ../../counter.db relative to apps/web cwd; we override to a per-test temp
 * file so suites don't clobber the hackathon's shared demo DB.)
 */
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

export function useTempDb(label: string): string {
  const tmp = path.join(os.tmpdir(), `counter-web-${label}-${Date.now()}.db`);
  process.env.DB_PATH = tmp;
  return tmp;
}

export function cleanupDb(tmpPath: string): void {
  for (const suffix of ["", "-wal", "-shm", "-journal"]) {
    try {
      fs.unlinkSync(tmpPath + suffix);
    } catch {
      // ignore
    }
  }
}

/** POST a JSON body to a Next.js route handler. */
export async function callJsonRoute<T>(
  handler: (req: Request, ctx?: unknown) => Promise<Response>,
  url: string,
  body?: unknown,
  ctx?: unknown,
): Promise<{ status: number; body: T }> {
  const req = new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const res = await handler(req, ctx);
  const status = res.status;
  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as T) : ({} as T);
  return { status, body: parsed };
}

/** GET a Next.js route handler that takes no params. */
export async function getJsonRoute<T>(
  handler: (req?: Request) => Promise<Response>,
  url: string,
): Promise<{ status: number; body: T }> {
  const req = new Request(url, { method: "GET" });
  const res = await handler(req);
  const status = res.status;
  const text = await res.text();
  const parsed = text ? (JSON.parse(text) as T) : ({} as T);
  return { status, body: parsed };
}
