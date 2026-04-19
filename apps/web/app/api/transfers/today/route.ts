import { NextResponse } from "next/server";
import { listTransfersToday, sumRecoveredTodayCents } from "@/lib/transfers/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    totalCents: sumRecoveredTodayCents(),
    transfers: listTransfersToday().slice(0, 20),
  });
}
