import { NextResponse } from "next/server";
import { TRUST_FIXTURE } from "@/lib/trust-fixture";

export const dynamic = "force-dynamic";

/**
 * MERGE NOTE: When apps/voice ships /api/vanta/trust-center, swap to:
 *   const upstream = await fetch(process.env.TRUST_PROXY_URL!);
 *   return NextResponse.json(await upstream.json());
 */

export async function GET() {
  return NextResponse.json(TRUST_FIXTURE);
}
