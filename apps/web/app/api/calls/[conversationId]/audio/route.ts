/**
 * Audio proxy: thin pass-through to apps/voice's /calls/:id/audio
 * so the browser only talks to one origin.
 *
 * Falls back to a demo backup audio file when DEMO_AUDIO_FALLBACK=on
 * and the upstream returns non-200.
 */
import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const VOICE_URL =
  process.env["VOICE_SERVICE_URL"] ?? "http://localhost:4000";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  try {
    const upstream = await fetch(
      `${VOICE_URL}/calls/${encodeURIComponent(conversationId)}/audio`
    );

    if (upstream.ok && upstream.body) {
      return new Response(upstream.body, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  } catch {
    // Fall through to fallback
  }

  // Demo fallback: serve a pre-recorded backup audio
  if (process.env["DEMO_AUDIO_FALLBACK"] === "on") {
    const fallbackPath = path.join(
      process.cwd(),
      "public",
      "demo",
      "backup-call-audio.mp3"
    );
    if (fs.existsSync(fallbackPath)) {
      console.warn(
        `[audio-proxy] upstream failed for ${conversationId}, serving demo fallback`
      );
      const bytes = fs.readFileSync(fallbackPath);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  return new Response("audio_not_ready", { status: 404 });
}
