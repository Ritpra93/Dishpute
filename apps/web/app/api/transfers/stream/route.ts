/**
 * SSE stream of every persisted Stripe `transfer.created` event. Subscribed
 * to by the dashboard recovered-today counter so it springs up the moment
 * Stripe confirms a recovery hit the merchant's account.
 */

import { subscribeTransfers } from "@/lib/transfers/broker";
import { sumRecoveredTodayCents } from "@/lib/transfers/repo";

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
          // closed
        }
      };

      send({
        type: "snapshot",
        totalCents: sumRecoveredTodayCents(),
        timestamp: new Date().toISOString(),
      });

      const unsub = subscribeTransfers((t) => {
        send({
          type: "transfer",
          transfer: t,
          totalCents: sumRecoveredTodayCents(),
        });
      });

      const heartbeat = setInterval(
        () => send({ type: "heartbeat", timestamp: new Date().toISOString() }),
        15_000
      );

      return () => {
        clearInterval(heartbeat);
        unsub();
      };
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
