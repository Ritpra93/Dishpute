/**
 * SSE stream of AgentEvents for the /live demo.
 *
 * LIVE_MODE=fixture (default): replays LIVE_BATCH_SCRIPT in scripted real time.
 * LIVE_MODE=tinyfish: proxies three concurrent real TinyFish runs (one per channel).
 *   Requires TINYFISH_API_KEY and LIVE_PORTAL_BASE_URL (must be a public https:// URL).
 *   Falls back to fixture if key or base URL is missing/invalid.
 */

import { LIVE_BATCH_SCRIPT } from "@/lib/fixtures/live-batch-script";
import { mergeLiveTinyFishStreams } from "@/lib/live/tinyfish-live-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function useTinyfish(): { enabled: true; base: string } | { enabled: false } {
  if (process.env["LIVE_MODE"] !== "tinyfish") return { enabled: false };

  const key = process.env["TINYFISH_API_KEY"];
  const base = process.env["LIVE_PORTAL_BASE_URL"];

  if (!key || !base) {
    console.warn("[live/stream] LIVE_MODE=tinyfish but TINYFISH_API_KEY or LIVE_PORTAL_BASE_URL missing — falling back to fixture");
    return { enabled: false };
  }
  if (!base.startsWith("https://")) {
    console.warn("[live/stream] LIVE_PORTAL_BASE_URL must be a public https:// URL — falling back to fixture");
    return { enabled: false };
  }

  return { enabled: true, base };
}

export async function GET() {
  const encoder = new TextEncoder();

  const config = useTinyfish();

  if (config.enabled) {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );
        };

        send({ type: "open", timestamp: new Date().toISOString() });

        try {
          for await (const event of mergeLiveTinyFishStreams(config.base)) {
            try {
              send(event);
            } catch {
              // Client disconnected — abort
              return;
            }
          }
          send({ type: "close", timestamp: new Date().toISOString() });
          controller.close();
        } catch (err) {
          console.error("[live/stream] TinyFish stream error:", err);
          try {
            send({ type: "close", timestamp: new Date().toISOString() });
            controller.close();
          } catch {
            // already closed
          }
        }
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

  // Fixture replay (default)
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
