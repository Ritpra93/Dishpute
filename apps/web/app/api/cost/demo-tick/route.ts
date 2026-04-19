import { NextResponse } from "next/server";
import { recordDemoTick } from "@/lib/cost/session-store";
import { rateLimit } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env["ALLOW_DEMO_ARM"] !== "1"
  ) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  const rl = rateLimit(request, "demo-tick", { limit: 120, windowMs: 60_000 });
  if (rl) return rl;
  return NextResponse.json(recordDemoTick());
}
