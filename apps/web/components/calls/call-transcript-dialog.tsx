"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration, formatMoney, relativeTime } from "@/lib/format";
import type {
  DisplayCallRecord,
  CallOutcome,
  TranscriptTurn,
} from "@counter/types";

interface Props {
  call: DisplayCallRecord | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function CallTranscriptDialog({ call, open, onOpenChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [liveTurns, setLiveTurns] = useState<TranscriptTurn[]>([]);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [hasAudio, setHasAudio] = useState(false);

  // Determine effective transcript + outcome
  const isLive = call?.outcome === "live";
  const effectiveTurns =
    isLive && liveTurns.length > 0 ? liveTurns : call?.transcript ?? [];
  const audioReady =
    (call?.audioAvailable || hasAudio) && !isLive;

  // Live transcript subscription via SSE
  useEffect(() => {
    if (!call || !isLive || !open) {
      setLiveTurns([]);
      setLiveStatus(null);
      setHasAudio(false);
      return;
    }

    const es = new EventSource(`/api/calls/${call.id}/live`);

    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        setLiveStatus(payload.status);
        if (payload.hasAudio) setHasAudio(true);

        if (Array.isArray(payload.transcript)) {
          const mapped: TranscriptTurn[] = payload.transcript.map(
            (t: { role: string; message: string; time_in_call_secs: number }) => {
              const m = Math.floor(t.time_in_call_secs / 60);
              const s = Math.floor(t.time_in_call_secs % 60);
              return {
                ts: `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
                role:
                  t.role === "agent"
                    ? ("agent" as const)
                    : t.role === "tool"
                      ? ("tool" as const)
                      : ("rep" as const),
                text: t.message,
              };
            }
          );
          setLiveTurns(mapped);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do
    };

    return () => {
      es.close();
    };
  }, [call, isLive, open]);

  // Auto-scroll on new turns
  const turnCount = effectiveTurns.length;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turnCount]);

  if (!call) return null;

  const callEnded = liveStatus === "done" || liveStatus === "failed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[80vh] w-[min(960px,95vw)] grid-cols-1 gap-0 overflow-hidden p-0 sm:max-w-[960px] md:grid-cols-[300px_1fr]">
        <DialogHeader className="sr-only">
          <DialogTitle>Call transcript</DialogTitle>
        </DialogHeader>

        {/* Sidebar */}
        <aside className="space-y-5 border-r bg-secondary/30 p-6 md:max-h-[80vh] md:overflow-y-auto">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Call
            </div>
            <div className="mt-1 text-base font-semibold">
              {call.rep ?? "Platform support"}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {isLive && !callEnded && (
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse" />{" "}
                  Live
                </span>
              )}
              <span>{relativeTime(call.startedAt)}</span>
              <span>·</span>
              <span className="tabular-nums">
                {formatDuration(call.durationSec)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Linked dispute
            </div>
            <div className="mt-1 font-medium tabular-nums">{call.orderId}</div>
          </div>

          <div className="rounded-xl border bg-card p-4 text-xs">
            <div className="mb-1.5 font-medium">Outcome</div>
            <OutcomePill outcome={callEnded ? "recovered" : call.outcome} />
            {call.recovered > 0 && (
              <div className="mt-2 text-money">
                Recovered{" "}
                <span className="font-semibold tabular-nums">
                  {formatMoney(call.recovered)}
                </span>
              </div>
            )}
          </div>

          {call.toolsUsed.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                Tools used
              </div>
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
          )}

          {/* Audio player */}
          {audioReady && (
            <div>
              <div className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                Recording
              </div>
              <audio
                controls
                preload="metadata"
                src={`/api/calls/${call.id}/audio`}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Button variant="outline" size="sm" className="w-full">
              Export transcript
            </Button>
          </div>
        </aside>

        {/* Transcript pane */}
        <div ref={scrollRef} className="max-h-[80vh] overflow-y-auto p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Transcript</div>
            <div className="text-xs text-muted-foreground tabular-nums">
              {effectiveTurns.length} turns
            </div>
          </div>
          <ol className="space-y-3">
            {effectiveTurns.map((t, i) => (
              <li key={i} className="grid grid-cols-[60px_1fr] gap-3">
                <div className="pt-0.5 text-right font-mono text-[11px] text-muted-foreground">
                  {t.ts}
                </div>
                <div
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 text-sm",
                    t.role === "agent" &&
                      "border-money/20 bg-money-soft text-money-soft-foreground",
                    t.role === "rep" && "bg-card",
                    t.role === "tool" &&
                      "border-dashed bg-secondary/50 font-mono text-[12.5px]"
                  )}
                >
                  <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {t.role === "agent"
                      ? "Counter agent"
                      : t.role === "rep"
                        ? (call.rep ?? "Rep")
                        : `Tool · ${t.tool ?? "system"}`}
                  </div>
                  {t.text}
                </div>
              </li>
            ))}
          </ol>

          {/* Typing indicator while live */}
          {isLive && !callEnded && (
            <div className="mt-4 flex items-center gap-2 pl-[72px] text-muted-foreground">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-muted-foreground" />
                <span
                  className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-muted-foreground"
                  style={{ animationDelay: "0.15s" }}
                />
                <span
                  className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-muted-foreground"
                  style={{ animationDelay: "0.3s" }}
                />
              </span>
              <span className="text-xs">Listening…</span>
            </div>
          )}

          {/* Empty state */}
          {effectiveTurns.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-muted-foreground">
              {isLive ? (
                <>
                  <span className="mb-2 flex gap-1">
                    <span className="h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse" />
                    <span
                      className="h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </span>
                  Waiting for call to connect…
                </>
              ) : (
                "No transcript available."
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


function OutcomePill({ outcome }: { outcome: CallOutcome }) {
  const map: Record<CallOutcome, [string, string]> = {
    live: [
      "bg-denied-bg text-foreground border border-denied-border/40",
      "Live",
    ],
    recovered: ["bg-merit-high-bg text-merit-high-fg", "Recovered"],
    callback: ["bg-merit-mid-bg text-merit-mid-fg", "Callback scheduled"],
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
