/**
 * SSE stream of AgentEvents for the W2 /live demo. Replays the scripted
 * fixture in real time. Each event is encoded as a single SSE `data:` line.
 *
 * Closes itself after the last scripted event + 1s of trailing heartbeat.
 */

import { LIVE_BATCH_SCRIPT } from "@/lib/fixtures/live-batch-script";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
        );
      };

      send({ type: "open", timestamp: new Date().toISOString() });

      const timers: ReturnType<typeof setTimeout>[] = [];
      for (const step of LIVE_BATCH_SCRIPT) {
        timers.push(
          setTimeout(() => {
            const stamped = {
              ...step.event,
              event: {
                ...step.event.event,
                timestamp: new Date().toISOString(),
              },
            };
            try {
              send(stamped);
            } catch {
              // controller closed by client — ignore
            }
          }, step.delayMs)
        );
      }

      const lastDelay =
        LIVE_BATCH_SCRIPT[LIVE_BATCH_SCRIPT.length - 1]?.delayMs ?? 0;
      timers.push(
        setTimeout(() => {
          try {
            send({ type: "close", timestamp: new Date().toISOString() });
            controller.close();
          } catch {
            // already closed
          }
        }, lastDelay + 800)
      );
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
