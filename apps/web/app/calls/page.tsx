"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { TopNav } from "@/components/top-nav";
import { StatCard } from "@/components/stat-card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CallTranscriptDialog } from "@/components/calls/call-transcript-dialog";
import { cn } from "@/lib/utils";
import { formatDuration, formatMoney, relativeTime } from "@/lib/format";
import type { DisplayCallRecord, CallOutcome } from "@counter/types";

interface CallsData {
  calls: DisplayCallRecord[];
  stats: {
    recovered: number;
    successRate: number;
    avgDuration: number;
    active: number;
  };
}

type Filter = "all" | "live" | "recovered" | "callback" | "still_denied";

export default function CallsPage() {
  const [data, setData] = useState<CallsData | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<DisplayCallRecord | null>(null);
  const openedAtRef = useRef(Date.now());

  const fetchCalls = useCallback(() => {
    fetch("/api/calls")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Auto-refresh polling: 3s interval while tab is visible AND
  // (at least one live call OR page opened < 60s ago)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      const hasLive = data?.calls.some((c) => c.outcome === "live");
      const recentOpen = Date.now() - openedAtRef.current < 60_000;

      if (hasLive || recentOpen) {
        fetchCalls();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [data, fetchCalls]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.calls.filter((c) => {
      if (filter !== "all" && c.outcome !== filter) return false;
      if (
        q &&
        !c.transcript.some((t) =>
          t.text.toLowerCase().includes(q.toLowerCase())
        )
      )
        return false;
      return true;
    });
  }, [data, filter, q]);

  const stats = data?.stats;

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8">
          <div className="text-xs font-medium uppercase tracking-wider text-foreground/60">
            House of Curry · Voice operations
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Calls &amp; transcripts
          </h1>
          <p className="text-sm text-foreground/70">
            When portals say no, Counter calls them. Every call is recorded and
            reasoned.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Recovered via voice"
            value={stats?.recovered ?? 0}
            tone="money"
          />
          <StatCard
            label="Success rate"
            value={stats?.successRate ?? 0}
            format="number"
            sublabel="of escalated calls"
          />
          <StatCard
            label="Avg duration"
            value={stats?.avgDuration ?? 0}
            format="number"
            sublabel="seconds"
            tone="muted"
          />
          <StatCard
            label="Active calls"
            value={stats?.active ?? 0}
            format="number"
            tone={(stats?.active ?? 0) > 0 ? "danger" : "default"}
            pulse={(stats?.active ?? 0) > 0}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="glass flex flex-wrap gap-1 rounded-full p-1">
            {(
              [
                ["all", "All"],
                ["live", "Live"],
                ["recovered", "Recovered"],
                ["callback", "Callback"],
                ["still_denied", "Still denied"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  filter === k
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <Input
            placeholder="Search transcripts…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 w-64"
          />
        </div>

        <div className="glass mt-6 overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Started</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Recovered</TableHead>
                <TableHead className="pr-5">Transcript preview</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "cursor-pointer animate-row-in",
                    c.outcome === "live" &&
                      "border-l-2 border-l-live-pulse bg-denied-bg/30"
                  )}
                >
                  <TableCell className="pl-5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {c.outcome === "live" && (
                        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse" />
                      )}
                      {relativeTime(c.startedAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium tabular-nums">{c.orderId}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.rep}
                    </div>
                  </TableCell>
                  <TableCell>
                    <OutcomePill outcome={c.outcome} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatDuration(c.durationSec)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-money">
                    {c.recovered > 0 ? formatMoney(c.recovered) : "—"}
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate pr-5 text-xs text-muted-foreground">
                    {c.transcript[0]?.text}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    {data ? "No calls match this filter." : "Loading…"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      <CallTranscriptDialog
        call={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}

function OutcomePill({ outcome }: { outcome: CallOutcome }) {
  const map: Record<CallOutcome, [string, string]> = {
    live: [
      "bg-denied-bg text-foreground border border-denied-border/40",
      "Live",
    ],
    recovered: ["bg-merit-high-bg text-merit-high-fg", "Recovered"],
    callback: ["bg-merit-mid-bg text-merit-mid-fg", "Callback"],
    still_denied: ["bg-secondary text-muted-foreground", "Still denied"],
  };
  const [cls, label] = map[outcome];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        cls
      )}
    >
      {label}
    </span>
  );
}
