/**
 * S5 — 86 the salmon: multi-portal menu item toggle.
 *
 * Marks a menu item as unavailable (86'd) across selected platforms
 * using the TinyFish batch endpoint. Each platform gets its own run
 * with a platform-specific goal.
 *
 * Note: apps/web/lib/ops/tinyfish-client.ts has a similar dispatch but
 * uses the wrong auth header (Authorization: Bearer instead of X-API-Key).
 * This implementation uses the correct header per VERIFIED_APIS.md.
 * W3 can swap their import to @counter/scraper when ready.
 */

import type { Platform } from "@counter/types";
import { runTinyFishBatch, type BatchRunSpec } from "./batch";

/** Portal URLs per platform — W3's mock portals. */
const PORTAL_URLS: Record<Platform, string> = {
  doordash: process.env["MOCK_PORTAL_URL"] ?? "http://localhost:3000/mock-portal",
  ubereats: process.env["MOCK_PORTAL_UE_URL"] ?? "http://localhost:3000/mock-portal-grubhub",
  grubhub: process.env["MOCK_PORTAL_GH_URL"] ?? "http://localhost:3000/mock-portal-grubhub",
};

export interface EightySixOpts {
  itemId: string;
  itemName: string;
  durationHours: number;
  platforms: Platform[];
}

export interface EightySixResult {
  mode: "live" | "fixture";
  batchId: string;
  startedAt: string;
  runs: Array<{
    runId: string;
    platform: Platform;
    status: "PENDING" | "RUNNING" | "COMPLETED";
  }>;
}

/**
 * Mark a menu item as 86'd across the specified platforms.
 * Falls back to fixture mode if TINYFISH_API_KEY is not set.
 */
export async function eightySixItem(opts: EightySixOpts): Promise<EightySixResult> {
  const startedAt = new Date().toISOString();
  const apiKey = process.env["TINYFISH_API_KEY"];

  if (!apiKey) {
    return {
      mode: "fixture",
      batchId: `batch_fixture_${Date.now()}`,
      startedAt,
      runs: opts.platforms.map((p, i) => ({
        runId: `run_86_fixture_${Date.now()}_${i}`,
        platform: p,
        status: "COMPLETED",
      })),
    };
  }

  const runs: BatchRunSpec[] = opts.platforms.map((platform) => ({
    url: `${PORTAL_URLS[platform]}/menu`,
    goal: buildEightySixGoal(platform, opts),
    browser_profile: "lite" as const,
  }));

  const { runIds } = await runTinyFishBatch(runs);

  return {
    mode: "live",
    batchId: `batch_86_${Date.now()}`,
    startedAt,
    runs: opts.platforms.map((platform, i) => ({
      runId: runIds[i] ?? `unknown_${i}`,
      platform,
      status: "PENDING" as const,
    })),
  };
}

function buildEightySixGoal(platform: Platform, opts: EightySixOpts): string {
  const base = `Find the menu item "${opts.itemName}" (ID: ${opts.itemId}) and mark it as unavailable (86'd) for ${opts.durationHours} hours.`;

  switch (platform) {
    case "doordash":
      return `${base} On DoorDash, navigate to Menu Manager, find the item, click the toggle to disable it, and confirm. Return { "success": true, "platform": "doordash" }.`;
    case "ubereats":
      return `${base} On UberEats, navigate to Menu, find the item, click "Mark as sold out", set duration to ${opts.durationHours} hours, and confirm. Return { "success": true, "platform": "ubereats" }.`;
    case "grubhub":
      return `${base} On Grubhub, navigate to Menu, find the item, click "86 Item", and confirm. Return { "success": true, "platform": "grubhub" }.`;
  }
}

/**
 * Restore a previously 86'd item across platforms.
 */
export async function unEightySixItem(opts: {
  itemId: string;
  itemName: string;
  platforms: Platform[];
}): Promise<EightySixResult> {
  const startedAt = new Date().toISOString();
  const apiKey = process.env["TINYFISH_API_KEY"];

  if (!apiKey) {
    return {
      mode: "fixture",
      batchId: `batch_fixture_un86_${Date.now()}`,
      startedAt,
      runs: opts.platforms.map((p, i) => ({
        runId: `run_un86_fixture_${Date.now()}_${i}`,
        platform: p,
        status: "COMPLETED",
      })),
    };
  }

  const runs: BatchRunSpec[] = opts.platforms.map((platform) => ({
    url: `${PORTAL_URLS[platform]}/menu`,
    goal: `Find the menu item "${opts.itemName}" (ID: ${opts.itemId}) and restore it (un-86). Make it available again on ${platform}. Return { "success": true, "platform": "${platform}" }.`,
    browser_profile: "lite" as const,
  }));

  const { runIds } = await runTinyFishBatch(runs);

  return {
    mode: "live",
    batchId: `batch_un86_${Date.now()}`,
    startedAt,
    runs: opts.platforms.map((platform, i) => ({
      runId: runIds[i] ?? `unknown_${i}`,
      platform,
      status: "PENDING" as const,
    })),
  };
}
