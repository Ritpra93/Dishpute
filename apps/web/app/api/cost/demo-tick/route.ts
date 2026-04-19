import { NextResponse } from "next/server";
import { recordDemoTick } from "@/lib/cost/session-store";

export const dynamic = "force-dynamic";

export async function POST() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env["ALLOW_DEMO_ARM"] !== "1"
  ) {
    return NextResponse.json({ error: "disabled" }, { status: 403 });
  }
  return NextResponse.json(recordDemoTick());
}
