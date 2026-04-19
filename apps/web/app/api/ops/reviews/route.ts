import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/parse-request";
import { dispatchOpsBatch, type OpsPlatform } from "@/lib/ops/tinyfish-client";

export const dynamic = "force-dynamic";

const PLATFORMS = ["doordash", "ubereats", "grubhub"] as const;

const Schema = z.object({
  reviewId: z.string().min(1).max(64),
  platform: z.enum(PLATFORMS),
  reply: z.string().min(10).max(1000),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, Schema);
  if (!parsed.ok) return parsed.response;
  const { reviewId, platform, reply } = parsed.data;

  const result = await dispatchOpsBatch([
    {
      platform: platform as OpsPlatform,
      goal: `Reply to review ${reviewId} on ${platform}.`,
      payload: { action: "reply_to_review", reviewId, reply },
    },
  ]);

  return NextResponse.json(result);
}
