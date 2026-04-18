import { NextResponse } from "next/server";
import { listEnrichedDisputes } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function GET() {
  const disputes = listEnrichedDisputes();
  return NextResponse.json(disputes);
}
