import { NextResponse } from "next/server";
import { z } from "zod";
import { getScraper, getClassifier } from "@/lib/services";
import { parseJson } from "@/lib/parse-request";
import {
  resetAllTables,
  upsertCandidate,
  upsertClassification,
} from "@/lib/repo";
import { DEMO_MERCHANT } from "@/lib/types";

export const dynamic = "force-dynamic";

const ScanRequestSchema = z.object({
  platform: z.literal("doordash").optional(),
  reset: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, ScanRequestSchema);
  if (!parsed.ok) return parsed.response;

  const platform = parsed.data.platform ?? "doordash";

  if (parsed.data.reset) {
    if (process.env["ALLOW_DESTRUCTIVE_RESET"] !== "1") {
      return NextResponse.json(
        {
          error:
            "Destructive reset is disabled. Use `pnpm seed` locally, or set ALLOW_DESTRUCTIVE_RESET=1 to enable this endpoint.",
        },
        { status: 403 }
      );
    }
    resetAllTables();
  }

  const scraper = getScraper();
  const classifier = getClassifier();

  const candidates = await scraper.listOpenDisputes({
    merchantId: DEMO_MERCHANT.id,
    platform,
  });

  const scrapedAt = new Date().toISOString();
  for (const c of candidates) upsertCandidate(c, scrapedAt);

  const classifications = await classifier.classifyMany(candidates);
  for (const c of classifications) upsertClassification(c);

  return NextResponse.json({
    jobId: `scan_${Date.now()}`,
    totalFound: candidates.length,
    classified: classifications.length,
  });
}
