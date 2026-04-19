import { NextResponse } from "next/server";
import { getSessionCost } from "@/lib/cost/session-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSessionCost());
}
