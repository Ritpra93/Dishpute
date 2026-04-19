/**
 * Deterministic ReplayArtifact fixtures for W11. Each artifact is built so the
 * scrubber demo has at least one strategy escalation and one fallback marker
 * to point at during the pitch.
 */

import type { ReplayArtifact, ReplayStep } from "@counter/types";

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==";

function step(
  i: number,
  baseIso: string,
  action: string,
  reasoning: string,
  durationMs = 1200
): ReplayStep {
  return {
    id: `step_${i}`,
    index: i,
    timestamp: new Date(new Date(baseIso).getTime() + i * durationMs).toISOString(),
    status: "COMPLETED",
    action,
    screenshotDataUrl: PIXEL,
    reasoning,
    durationMs,
  };
}

const T0 = "2026-04-18T09:14:32.000Z";
const RUN_ID = "run_doordash_demo_001";
const CANDIDATE_ID = "cand_doordash_001";

export const REPLAY_ARTIFACTS: Record<string, ReplayArtifact> = {
  [RUN_ID]: {
    runId: RUN_ID,
    candidateId: CANDIDATE_ID,
    goal: "File missing-item dispute on DoorDash for order #5829-A11",
    status: "COMPLETED",
    createdAt: T0,
    startedAt: T0,
    finishedAt: "2026-04-18T09:14:48.000Z",
    totalSteps: 10,
    steps: [
      step(0, T0, "navigate(https://merchants.doordash.com/orders)", "Loading merchant portal — Vault credentials injected."),
      step(1, T0, "click('Order #5829-A11')", "Found target order in last-7-day window."),
      step(2, T0, "extract_dom('order-summary')", "Captured items, charge total, and timestamp for evidence."),
      step(3, T0, "click('Help → Dispute charge')", "Opening dispute flow."),
      step(4, T0, "select('Reason: Items missing or wrong')", "Mapped from classifier → category 'missing_item'."),
      step(5, T0, "type(textarea, Counter-drafted body)", "Pasted classifier-drafted dispute paragraph."),
      step(6, T0, "click('Submit')", "Form posted; awaiting platform confirmation."),
      step(7, T0, "wait_for(confirmation_modal, 8s)", "Got auto-denial banner — pivoting strategy.", 1800),
      step(8, T0, "navigate('/disputes/5829-A11')", "Re-opening dispute under high-thinking mode."),
      step(9, T0, "annotate_for_voice_handoff()", "Packaged context for voice escalation; queued in /api/voice/calls."),
    ],
    events: [
      { type: "STARTED", runId: RUN_ID, timestamp: T0 },
      {
        type: "PROGRESS",
        runId: RUN_ID,
        purpose: "loading merchant portal",
        timestamp: T0,
      },
      {
        type: "STRATEGY_ESCALATED",
        runId: RUN_ID,
        fromMode: "auto",
        toMode: "high",
        reason: "Auto-denial detected; switching to high-thinking + voice handoff",
        timestamp: "2026-04-18T09:14:43.000Z",
      },
      {
        type: "FALLBACK_ENGAGED",
        runId: RUN_ID,
        fallback: "manual_handoff",
        reason: "Tier-2 voice queue accepted",
        timestamp: "2026-04-18T09:14:46.000Z",
      },
      {
        type: "COMPLETE",
        runId: RUN_ID,
        status: "COMPLETED",
        timestamp: "2026-04-18T09:14:48.000Z",
      },
    ],
    escalations: [
      {
        atStepIndex: 7,
        fromMode: "auto",
        toMode: "high",
        reason: "Auto-denial detected; switching to high-thinking + voice handoff",
        timestamp: "2026-04-18T09:14:43.000Z",
      },
    ],
    videoUrl: null,
    result: { confirmationId: "DD-9F32-220A" },
    error: null,
  },
};

export function getReplay(runId: string): ReplayArtifact | undefined {
  return REPLAY_ARTIFACTS[runId];
}

export function listReplayIds(): string[] {
  return Object.keys(REPLAY_ARTIFACTS);
}
