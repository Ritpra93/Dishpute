/**
 * SSE stream: polls apps/voice for live transcript updates every 2s.
 * Closes when the call ends or after a 5-minute hard ceiling.
 */

const VOICE_URL =
  process.env["VOICE_SERVICE_URL"] ?? "http://localhost:4000";

const CONVERSATION_ID_RE = /^[A-Za-z0-9_:.-]{1,128}$/;

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  if (!CONVERSATION_ID_RE.test(conversationId)) {
    return new Response(
      JSON.stringify({ error: "Invalid conversationId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const deadline = Date.now() + 5 * 60_000; // 5-minute hard ceiling

      while (Date.now() < deadline) {
        try {
          const upstream = await fetch(
            `${VOICE_URL}/calls/${encodeURIComponent(conversationId)}/live-transcript`
          );
          const payload = await upstream.json();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          );

          // Terminal states: done, failed
          if (
            payload.status === "done" ||
            payload.status === "failed"
          ) {
            break;
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`
            )
          );
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
