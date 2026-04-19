/**
 * In-process pub/sub for "transfer.created" events the dashboard counter
 * subscribes to. The webhook + demo-arm handlers `publish()` after persisting
 * to the DB; the SSE route `subscribe()` and forwards each tick to clients.
 *
 * This is a single-process broker — fine for the demo and any single Next
 * server. If we ever scale to multiple instances we'll swap to Redis or
 * Postgres LISTEN/NOTIFY.
 */

import type { RecoveredTransfer } from "./repo";

type Listener = (t: RecoveredTransfer) => void;

declare global {
  var __counterTransferListeners: Set<Listener> | undefined;
}

function listeners(): Set<Listener> {
  if (!globalThis.__counterTransferListeners) {
    globalThis.__counterTransferListeners = new Set<Listener>();
  }
  return globalThis.__counterTransferListeners;
}

export function publishTransfer(t: RecoveredTransfer): void {
  for (const listener of listeners()) {
    try {
      listener(t);
    } catch {
      // never let one bad subscriber break the others
    }
  }
}

export function subscribeTransfers(fn: Listener): () => void {
  listeners().add(fn);
  return () => {
    listeners().delete(fn);
  };
}
