import { NextResponse } from "next/server";
import { FIXTURE_WARNINGS } from "@/lib/fixtures/warnings";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ warnings: FIXTURE_WARNINGS });
}
