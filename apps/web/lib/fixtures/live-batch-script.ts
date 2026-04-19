/**
 * Scripted AgentEvent timeline for the W2 /live demo. Replayed by the
 * /api/live/stream SSE endpoint. Times are deltas from stream open.
 */

import type { AgentEvent } from "@/lib/types";

interface ScriptStep {
  delayMs: number;
  event: AgentEvent;
}

function ts(): string {
  return new Date().toISOString();
}

const RUN_DD = "run_dd_demo_001";
const RUN_UE = "run_ue_demo_002";
const RUN_GH = "run_gh_demo_003";

export const LIVE_BATCH_SCRIPT: ScriptStep[] = [
  { delayMs: 200,  event: { channel: "doordash",  event: { type: "STARTED", runId: RUN_DD, timestamp: ts() } } },
  { delayMs: 350,  event: { channel: "ubereats",  event: { type: "STARTED", runId: RUN_UE, timestamp: ts() } } },
  { delayMs: 500,  event: { channel: "grubhub",   event: { type: "STARTED", runId: RUN_GH, timestamp: ts() } } },

  { delayMs: 1100, event: { channel: "doordash",  event: { type: "PROGRESS", runId: RUN_DD, purpose: "Loading merchant disputes table", timestamp: ts() } } },
  { delayMs: 1300, event: { channel: "ubereats",  event: { type: "PROGRESS", runId: RUN_UE, purpose: "Authenticating with vault credentials", timestamp: ts() } } },
  { delayMs: 1500, event: { channel: "grubhub",   event: { type: "PROGRESS", runId: RUN_GH, purpose: "Navigating to adjustments queue", timestamp: ts() } } },

  { delayMs: 2400, event: { channel: "doordash",  candidateId: "disp_dd_001", event: { type: "PROGRESS", runId: RUN_DD, purpose: "Inspecting #00451 — missing chicken biryani ($18.00)", timestamp: ts() } } },
  { delayMs: 2700, event: { channel: "ubereats",  candidateId: "disp_ue_001", event: { type: "PROGRESS", runId: RUN_UE, purpose: "Reading customer note: \"order arrived 90 minutes late, food cold\"", timestamp: ts() } } },
  { delayMs: 3100, event: { channel: "grubhub",   candidateId: "disp_gh_001", event: { type: "PROGRESS", runId: RUN_GH, purpose: "Cross-checking POS receipt for #GH-9821", timestamp: ts() } } },

  { delayMs: 4200, event: { channel: "doordash",  candidateId: "disp_dd_001", event: { type: "PROGRESS", runId: RUN_DD, purpose: "Filing dispute — high-merit, item-missing pattern", timestamp: ts() } } },
  { delayMs: 4500, event: { channel: "ubereats",  candidateId: "disp_ue_001", event: { type: "STRATEGY_ESCALATED", runId: RUN_UE, fromMode: "auto", toMode: "high", reason: "Ambiguous denial reason — pivoting to extended thinking before retry", timestamp: ts() } } },
  { delayMs: 4900, event: { channel: "grubhub",   candidateId: "disp_gh_001", event: { type: "PROGRESS", runId: RUN_GH, purpose: "Submitting adjustment with 2 evidence screenshots", timestamp: ts() } } },

  { delayMs: 5800, event: { channel: "doordash",  candidateId: "disp_dd_001", event: { type: "COMPLETE", runId: RUN_DD, status: "COMPLETED", result: { recovered_cents: 1800 }, timestamp: ts() } } },
  { delayMs: 6300, event: { channel: "ubereats",  candidateId: "disp_ue_001", event: { type: "PROGRESS", runId: RUN_UE, purpose: "Filing escalated dispute with extended evidence packet", timestamp: ts() } } },
  { delayMs: 6700, event: { channel: "grubhub",   candidateId: "disp_gh_001", event: { type: "COMPLETE", runId: RUN_GH, status: "COMPLETED", result: { recovered_cents: 2240 }, timestamp: ts() } } },

  { delayMs: 7600, event: { channel: "doordash",  candidateId: "disp_dd_002", event: { type: "PROGRESS", runId: RUN_DD, purpose: "Inspecting #00478 — wrong item delivered ($14.50)", timestamp: ts() } } },
  { delayMs: 8100, event: { channel: "ubereats",  candidateId: "disp_ue_001", event: { type: "COMPLETE", runId: RUN_UE, status: "COMPLETED", result: { recovered_cents: 3600 }, timestamp: ts() } } },
  { delayMs: 8400, event: { channel: "grubhub",   candidateId: "disp_gh_002", event: { type: "PROGRESS", runId: RUN_GH, purpose: "Inspecting #GH-9847 — partial delivery, missing 2 items", timestamp: ts() } } },

  { delayMs: 9300, event: { channel: "doordash",  candidateId: "disp_dd_002", event: { type: "COMPLETE", runId: RUN_DD, status: "COMPLETED", result: { recovered_cents: 1450 }, timestamp: ts() } } },
  { delayMs: 9700, event: { channel: "ubereats",  candidateId: "disp_ue_002", event: { type: "PROGRESS", runId: RUN_UE, purpose: "Inspecting #UE-2204 — never-delivered ($26.50)", timestamp: ts() } } },
  { delayMs: 10200, event: { channel: "grubhub",   candidateId: "disp_gh_002", event: { type: "COMPLETE", runId: RUN_GH, status: "COMPLETED", result: { recovered_cents: 1620 }, timestamp: ts() } } },

  { delayMs: 11000, event: { channel: "doordash",  candidateId: "disp_dd_003", event: { type: "FALLBACK_ENGAGED", runId: RUN_DD, fallback: "stealth_profile", reason: "Portal returned interstitial — switching to stealth browser profile", timestamp: ts() } } },
  { delayMs: 11500, event: { channel: "ubereats",  candidateId: "disp_ue_002", event: { type: "COMPLETE", runId: RUN_UE, status: "COMPLETED", result: { recovered_cents: 2650 }, timestamp: ts() } } },
  { delayMs: 12200, event: { channel: "doordash",  candidateId: "disp_dd_003", event: { type: "PROGRESS", runId: RUN_DD, purpose: "Re-attempting #00502 in stealth mode", timestamp: ts() } } },

  { delayMs: 13400, event: { channel: "doordash",  candidateId: "disp_dd_003", event: { type: "COMPLETE", runId: RUN_DD, status: "COMPLETED", result: { recovered_cents: 2210 }, timestamp: ts() } } },

  { delayMs: 14200, event: { channel: "doordash",  event: { type: "HEARTBEAT", timestamp: ts() } } },
  { delayMs: 14400, event: { channel: "ubereats",  event: { type: "HEARTBEAT", timestamp: ts() } } },
  { delayMs: 14600, event: { channel: "grubhub",   event: { type: "HEARTBEAT", timestamp: ts() } } },
];
