import { NextResponse } from "next/server";
import { createMockScraper } from "@/lib/mock-scraper";
import { createMockClassifier } from "@/lib/mock-classifier";
import {
  resetAllTables,
  upsertCandidate,
  upsertClassification,
} from "@/lib/repo";
import { DEMO_MERCHANT, type Platform } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ScanRequest {
  platform?: Platform;
  reset?: boolean;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ScanRequest;
  const platform = body.platform ?? "doordash";

  if (platform !== "doordash") {
    return NextResponse.json(
      { error: `Only doordash is supported in the demo. Got ${platform}.` },
      { status: 400 }
    );
  }

  if (body.reset) resetAllTables();

  const scraper = createMockScraper({ latencyMs: 800 });
  const classifier = createMockClassifier({ latencyMs: 0 });

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
