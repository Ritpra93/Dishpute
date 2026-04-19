/**
 * GET /api/reasoning/:id  (text/event-stream)
 *
 * Streams a synthesised "thinking" trace for a dispute. The transcript is
 * derived deterministically from the classification reasoning text plus a
 * canned scaffold of agent steps (gather → score → strategy). Each step is
 * emitted as a discrete SSE message so the UI can type it in.
 *
 * Used by W10 (ReasoningPanel slide-out) on the dispute detail.
 */

import { getCandidate, getClassification } from "@/lib/repo";
import type { DisputeCandidate, ClassifiedDispute } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface Step {
  kind: "thinking" | "tool" | "decision";
  label?: string;
  text: string;
  tokens?: number;
  delayMs: number;
}

function buildSteps(
  candidate: DisputeCandidate,
  classification: ClassifiedDispute | undefined
): Step[] {
  const items = candidate.itemsReported
    .map((i) => `${i.quantity}× ${i.name}`)
    .join(", ");

  const reasoning = classification?.reasoning ?? "Classifier reasoning unavailable.";
  const reasoningChunks = reasoning
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const steps: Step[] = [
    {
      kind: "thinking",
      text: `Inspecting order ${candidate.orderId} on ${candidate.platform}…`,
      tokens: 14,
      delayMs: 350,
    },
    {
      kind: "tool",
      label: "lookup_order",
      text: `Resolved ${items} · charged $${(candidate.chargeAmountCents / 100).toFixed(2)}`,
      tokens: 22,
      delayMs: 450,
    },
    {
      kind: "tool",
      label: "fetch_evidence",
      text: `Pulled receipt JSON, customer note, and screenshot → ${
        classification?.evidenceCitations.length ?? 0
      } citation(s)`,
      tokens: 18,
      delayMs: 500,
    },
    ...reasoningChunks.slice(0, 4).map((chunk, idx) => ({
      kind: "thinking" as const,
      text: chunk,
      tokens: Math.max(8, Math.round(chunk.length / 4)),
      delayMs: 400 + idx * 80,
    })),
    {
      kind: "decision",
      label: "merit_score",
      text: `Scored merit ${
        classification ? classification.meritScore : "?"
      } / 100 — ${
        classification && classification.meritScore >= 70
          ? "auto-submit"
          : "hold for human"
      }`,
      tokens: 12,
      delayMs: 500,
    },
    {
      kind: "decision",
      label: "strategy",
      text:
        classification && classification.meritScore >= 70
          ? "File via portal; if denied within 24h, escalate to voice."
          : "Surface to operator for one-click approve.",
      tokens: 16,
      delayMs: 500,
    },
  ];
  return steps;
}

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

  const candidate = getCandidate(id);
  if (!candidate) return new Response("not found", { status: 404 });
  const classification = getClassification(id);

  const steps = buildSteps(candidate, classification);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
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
        type: "start",
        candidateId: id,
        autoBadge: classification
          ? classification.meritScore >= 70
            ? "auto-submit"
            : "review"
          : "review",
        meritScore: classification?.meritScore ?? null,
      });

      let totalTokens = 0;
      for (const step of steps) {
        await new Promise((r) => setTimeout(r, step.delayMs));
        totalTokens += step.tokens ?? 0;
        send({
          type: "step",
          kind: step.kind,
          label: step.label ?? null,
          text: step.text,
          tokens: step.tokens ?? null,
          totalTokens,
        });
      }

      send({ type: "done", totalTokens });
      controller.close();
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
