/**
 * SSE feed of EarlyWarnings. Replays the fixture set with a few seconds of
 * stagger, then keeps the connection alive with periodic heartbeats so the
 * sidebar widget shows a live indicator.
 */

import { FIXTURE_WARNINGS } from "@/lib/fixtures/warnings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        } catch {
          // closed by client
        }
      };

      send({ type: "open", timestamp: new Date().toISOString() });

      const timers: ReturnType<typeof setTimeout>[] = [];
      FIXTURE_WARNINGS.forEach((warning, i) => {
        timers.push(
          setTimeout(() => send({ type: "warning", warning }), 600 + i * 1100)
        );
      });

      const heartbeat = setInterval(
        () => send({ type: "heartbeat", timestamp: new Date().toISOString() }),
        15_000
      );

      const closer = () => {
        clearInterval(heartbeat);
        for (const t of timers) clearTimeout(t);
      };

      controller.enqueue(encoder.encode(":\n\n"));

      return closer;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
