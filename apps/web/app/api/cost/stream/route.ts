import { getSessionCost, subscribeCost } from "@/lib/cost/session-store";

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

      send({ type: "snapshot", cost: getSessionCost() });
      const unsub = subscribeCost((cost) => send({ type: "tick", cost }));
      const heartbeat = setInterval(
        () => send({ type: "heartbeat", at: new Date().toISOString() }),
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
