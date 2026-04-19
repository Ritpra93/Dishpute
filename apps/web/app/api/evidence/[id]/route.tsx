/**
 * GET /api/evidence/{disputeId}  →  application/pdf
 *
 * Streams a one-page evidence packet (W3) for the requested dispute. Reads
 * directly from the SQLite repo + a synthesised EvidenceBundle — no external
 * fetches.
 */

import "server-only";
import { renderToStream } from "@react-pdf/renderer";
import { buildEvidenceBundle } from "@/lib/evidence/build-bundle";
import { EvidencePdf } from "@/lib/evidence/pdf-document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return new Response(JSON.stringify({ error: "Invalid id" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const bundle = buildEvidenceBundle({ id });
  if (!bundle) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  const stream = await renderToStream(<EvidencePdf bundle={bundle} />);

  const reader = stream as unknown as NodeJS.ReadableStream;
  const webStream = new ReadableStream<Uint8Array>({
    start(controller) {
      reader.on("data", (chunk: Buffer) =>
        controller.enqueue(new Uint8Array(chunk))
      );
      reader.on("end", () => controller.close());
      reader.on("error", (err) => controller.error(err));
    },
  });

  return new Response(webStream, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="counter-evidence-${id}.pdf"`,
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}
