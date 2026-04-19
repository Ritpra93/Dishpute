import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJson } from "@/lib/parse-request";
import { dispatchOpsBatch, type OpsPlatform } from "@/lib/ops/tinyfish-client";

export const dynamic = "force-dynamic";

const PLATFORMS = ["doordash", "ubereats", "grubhub"] as const;

const Schema = z.object({
  itemId: z.string().min(1).max(64),
  itemName: z.string().min(1).max(120),
  newPriceCents: z.number().int().min(50).max(50_000),
  platforms: z.array(z.enum(PLATFORMS)).min(1).max(3),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, Schema);
  if (!parsed.ok) return parsed.response;
  const { itemId, itemName, newPriceCents, platforms } = parsed.data;

  const result = await dispatchOpsBatch(
    platforms.map((p) => ({
      platform: p as OpsPlatform,
      goal: `Update price of "${itemName}" to $${(newPriceCents / 100).toFixed(2)} on ${p}.`,
      payload: { action: "update_price", itemId, itemName, newPriceCents },
    }))
  );

  return NextResponse.json(result);
}
