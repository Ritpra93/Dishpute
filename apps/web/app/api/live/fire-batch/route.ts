/**
 * Fire-batch trigger for the W2 /live demo. The actual replay lives in the
 * SSE stream — this endpoint is a no-op the UI uses to give the trigger a
 * networked feel. Returns the run IDs the upstream stream will emit.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    batchId: `batch_${Date.now()}`,
    runs: [
      { channel: "doordash", runId: "run_dd_demo_001" },
      { channel: "ubereats", runId: "run_ue_demo_002" },
      { channel: "grubhub", runId: "run_gh_demo_003" },
    ],
    startedAt: new Date().toISOString(),
  });
}
