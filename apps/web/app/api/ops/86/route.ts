import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/parse-request";
import { dispatchOpsBatch, type OpsPlatform } from "@/lib/ops/tinyfish-client";

export const dynamic = "force-dynamic";

const PLATFORMS = ["doordash", "ubereats", "grubhub"] as const;

const Schema = z.object({
  itemId: z.string().min(1).max(64),
  itemName: z.string().min(1).max(120),
  durationHours: z.number().int().min(1).max(72),
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(3),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, Schema);
  if (!parsed.ok) return parsed.response;
  const { itemId, itemName, durationHours, platforms } = parsed.data;

  const result = await dispatchOpsBatch(
    platforms.map((p) => ({
      platform: p as OpsPlatform,
      goal: `Mark menu item "${itemName}" as 86'd on ${p} for ${durationHours} hours.`,
      payload: { action: "86_item", itemId, itemName, durationHours },
    }))
  );

  return NextResponse.json(result);
}
