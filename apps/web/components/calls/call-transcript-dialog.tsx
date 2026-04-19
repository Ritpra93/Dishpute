"use client";

import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration, formatMoney, relativeTime } from "@/lib/format";
import type { DisplayCallRecord, CallOutcome } from "@/app/api/calls/route";

interface Props {
  call: DisplayCallRecord | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CallTranscriptDialog({ call, open, onOpenChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (call?.outcome === "live" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [call]);

  if (!call) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[80vh] w-[min(960px,95vw)] grid-cols-1 gap-0 overflow-hidden p-0 sm:max-w-[960px] md:grid-cols-[300px_1fr]">
        <DialogHeader className="sr-only">
          <DialogTitle>Call transcript</DialogTitle>
        </DialogHeader>

        <aside className="space-y-5 border-r bg-secondary/30 p-6 md:max-h-[80vh] md:overflow-y-auto">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Call</div>
            <div className="mt-1 text-base font-semibold">{call.rep ?? "Platform support"}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {call.outcome === "live" && (
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse" /> Live
                </span>
              )}
              <span>{relativeTime(call.startedAt)}</span>
              <span>·</span>
              <span className="tabular-nums">{formatDuration(call.durationSec)}</span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Linked dispute</div>
            <div className="mt-1 font-medium tabular-nums">{call.orderId}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs">
            <div className="mb-1.5 font-medium">Outcome</div>
            <OutcomePill outcome={call.outcome} />
            {call.recovered > 0 && (
              <div className="mt-2 text-money">
                Recovered <span className="font-semibold tabular-nums">{formatMoney(call.recovered)}</span>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Tools used</div>
            <div className="flex flex-wrap gap-1.5">
              {call.toolsUsed.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] text-secondary-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full">
              Download audio (mock)
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              Export transcript
            </Button>
          </div>
        </aside>

        <div ref={scrollRef} className="max-h-[80vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Transcript</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {call.transcript.length} turns
            </div>
          </div>
          <ol className="space-y-3">
            {call.transcript.map((t, i) => (
              <li key={i} className="grid grid-cols-[60px_1fr] gap-3">
                <div className="pt-0.5 text-right font-mono text-[11px] text-muted-foreground">
                  {t.ts}
                </div>
                <div
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 text-sm",
                    t.role === "agent" && "border-money/20 bg-money-soft text-money-soft-foreground",
                    t.role === "rep" && "bg-card",
                    t.role === "tool" && "border-dashed bg-secondary/50 font-mono text-[12.5px]",
                  )}
                >
                  <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t.role === "agent"
                      ? "Counter agent"
                      : t.role === "rep"
                        ? (call.rep ?? "Rep")
                        : `Tool · ${t.tool}`}
                  </div>
                  {t.text}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OutcomePill({ outcome }: { outcome: CallOutcome }) {
  const map: Record<CallOutcome, [string, string]> = {
    live: ["bg-denied-bg text-foreground border border-denied-border/40", "Live"],
    recovered: ["bg-merit-high-bg text-merit-high-fg", "Recovered"],
    callback: ["bg-merit-mid-bg text-merit-mid-fg", "Callback scheduled"],
    still_denied: ["bg-secondary text-muted-foreground", "Still denied"],
  };
  const [cls, label] = map[outcome];
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", cls)}>
      {label}
    </span>
  );
}
