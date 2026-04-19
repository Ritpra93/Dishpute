import { NextResponse } from "next/server";

export type CallOutcome = "live" | "recovered" | "callback" | "still_denied";

export interface TranscriptTurn {
  ts: string;
  role: "agent" | "rep" | "tool";
  text: string;
  tool?: string;
}

export interface DisplayCallRecord {
  id: string;
  disputeId: string;
  orderId: string;
  startedAt: string;
  durationSec: number;
  outcome: CallOutcome;
  recovered: number;
  rep?: string;
  toolsUsed: string[];
  transcript: TranscriptTurn[];
}

const CALLS: DisplayCallRecord[] = [
  {
    id: "call_1",
    disputeId: "disp_25",
    orderId: "HOC-5235",
    startedAt: new Date(Date.now() - 90 * 1000).toISOString(),
    durationSec: 86,
    outcome: "live",
    recovered: 0,
    rep: "DoorDash Tier 2",
    toolsUsed: ["lookup_order", "fetch_kds_log", "transfer_to_supervisor"],
    transcript: [
      { ts: "00:02", role: "agent", text: "Hi, this is Counter calling on behalf of House of Curry regarding order HOC-5235. We're disputing a denied missing-item credit." },
      { ts: "00:09", role: "rep", text: "Sure, let me pull that up. One moment." },
      { ts: "00:18", role: "tool", tool: "lookup_order", text: "Retrieved order HOC-5235 — denied 2h ago." },
      { ts: "00:25", role: "rep", text: "I see the original review. The denial was based on no courier photo." },
      { ts: "00:31", role: "agent", text: "We have a timestamped handoff photo at 7:38 PM showing all 4 items bagged. Sending to your case file now." },
      { ts: "00:44", role: "tool", tool: "fetch_kds_log", text: "KDS log attached: ticket complete 7:34 PM, all items checked." },
      { ts: "00:51", role: "rep", text: "Got it. This does look like courier-side. Let me escalate." },
      { ts: "01:08", role: "tool", tool: "transfer_to_supervisor", text: "Transferred to supervisor queue." },
      { ts: "01:26", role: "agent", text: "Thanks. We're requesting full reversal of $42.50 plus the courier liability flag." },
    ],
  },
  {
    id: "call_2",
    disputeId: "disp_23",
    orderId: "HOC-5233",
    startedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    durationSec: 218,
    outcome: "recovered",
    recovered: 38.5,
    rep: "UberEats Support",
    toolsUsed: ["lookup_order", "submit_appeal"],
    transcript: [
      { ts: "00:03", role: "agent", text: "Calling about HOC-5233 — appealing a denied wrong-item dispute." },
      { ts: "00:11", role: "rep", text: "Let me check. Yes, denied yesterday." },
      { ts: "00:20", role: "agent", text: "KDS log shows correct ticket. Customer received from a different order." },
      { ts: "00:34", role: "tool", tool: "lookup_order", text: "Cross-reference: order HOC-5234 was for the same courier in the same trip." },
      { ts: "01:02", role: "rep", text: "That confirms it. I'll reverse the charge." },
      { ts: "01:18", role: "tool", tool: "submit_appeal", text: "Appeal accepted. $38.50 credited back." },
    ],
  },
  {
    id: "call_3",
    disputeId: "disp_24",
    orderId: "HOC-5234",
    startedAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    durationSec: 412,
    outcome: "callback",
    recovered: 0,
    rep: "Grubhub Tier 1",
    toolsUsed: ["lookup_order"],
    transcript: [
      { ts: "00:02", role: "agent", text: "Calling about HOC-5234 duplicate charge." },
      { ts: "00:30", role: "rep", text: "I need to escalate; you'll get a callback in 24h." },
    ],
  },
  {
    id: "call_4",
    disputeId: "disp_18",
    orderId: "HOC-5228",
    startedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    durationSec: 165,
    outcome: "recovered",
    recovered: 21.0,
    rep: "DoorDash Tier 1",
    toolsUsed: ["lookup_order", "submit_appeal"],
    transcript: [
      { ts: "00:01", role: "agent", text: "HOC-5228 — courier no-show, requesting refund." },
      { ts: "00:50", role: "rep", text: "Approved." },
    ],
  },
  {
    id: "call_5",
    disputeId: "disp_15",
    orderId: "HOC-5225",
    startedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    durationSec: 320,
    outcome: "recovered",
    recovered: 17.5,
    rep: "UberEats Support",
    toolsUsed: ["lookup_order"],
    transcript: [
      { ts: "00:01", role: "agent", text: "Appeal HOC-5225 wrong-item." },
      { ts: "01:00", role: "rep", text: "Refunded $17.50." },
    ],
  },
  {
    id: "call_6",
    disputeId: "disp_12",
    orderId: "HOC-5222",
    startedAt: new Date(Date.now() - 55 * 3600 * 1000).toISOString(),
    durationSec: 95,
    outcome: "still_denied",
    recovered: 0,
    rep: "Grubhub Tier 2",
    toolsUsed: ["lookup_order"],
    transcript: [
      { ts: "00:01", role: "agent", text: "HOC-5222 cold food appeal." },
      { ts: "01:00", role: "rep", text: "Sustaining denial; outside policy window." },
    ],
  },
  {
    id: "call_7",
    disputeId: "disp_9",
    orderId: "HOC-5219",
    startedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    durationSec: 240,
    outcome: "recovered",
    recovered: 28.0,
    rep: "DoorDash Tier 1",
    toolsUsed: ["lookup_order", "submit_appeal"],
    transcript: [
      { ts: "00:01", role: "agent", text: "HOC-5219 missing item." },
      { ts: "01:30", role: "rep", text: "Approved $28." },
    ],
  },
  {
    id: "call_8",
    disputeId: "disp_6",
    orderId: "HOC-5216",
    startedAt: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    durationSec: 178,
    outcome: "recovered",
    recovered: 19.5,
    rep: "UberEats Support",
    toolsUsed: ["lookup_order"],
    transcript: [
      { ts: "00:01", role: "agent", text: "HOC-5216 duplicate." },
      { ts: "01:10", role: "rep", text: "Voided." },
    ],
  },
];

export const CALL_STATS = {
  recovered: +CALLS.reduce((s, c) => s + c.recovered, 0).toFixed(2),
  successRate: Math.round(
    (CALLS.filter((c) => c.outcome === "recovered").length / CALLS.length) * 100
  ),
  avgDuration: Math.round(CALLS.reduce((s, c) => s + c.durationSec, 0) / CALLS.length),
  active: CALLS.filter((c) => c.outcome === "live").length,
};

export async function GET() {
  return NextResponse.json({ calls: CALLS, stats: CALL_STATS });
}
