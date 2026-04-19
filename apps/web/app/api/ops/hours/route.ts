import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/parse-request";
import { dispatchOpsBatch, type OpsPlatform } from "@/lib/ops/tinyfish-client";

export const dynamic = "force-dynamic";

const PLATFORMS = ["doordash", "ubereats", "grubhub"] as const;
const HHMM = /^\d{2}:\d{2}$/;

const Schema = z.object({
  day: z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]),
  open: z.string().regex(HHMM),
  close: z.string().regex(HHMM),
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(3),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, Schema);
  if (!parsed.ok) return parsed.response;
  const { day, open, close, platforms } = parsed.data;

  const result = await dispatchOpsBatch(
    platforms.map((p) => ({
      platform: p as OpsPlatform,
      goal: `On ${p}, set ${day} hours to ${open} – ${close}.`,
      payload: { action: "set_hours", day, open, close },
    }))
  );

  return NextResponse.json(result);
}
