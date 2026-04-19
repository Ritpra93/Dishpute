import { NextResponse } from "next/server";
import { getReplay } from "@/lib/fixtures/replay";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const { runId } = await context.params;
  const artifact = getReplay(runId);
  if (!artifact) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(artifact);
}
