"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, PlayCircle, RotateCcw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DollarCounter } from "@/components/dashboard/dollar-counter";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/lib/types";

type Channel = "doordash" | "ubereats" | "grubhub";

interface ChannelMeta {
  id: Channel;
  label: string;
  iframeSrc: string;
  accent: string;
}

const CHANNELS: ChannelMeta[] = [
  {
    id: "doordash",
    label: "DoorDash",
    iframeSrc: "/mock-portal/disputes",
    accent: "ring-red-500/40",
  },
  {
    id: "ubereats",
    label: "Uber Eats",
    iframeSrc: "/mock-portal-ubereats/disputes",
    accent: "ring-emerald-500/40",
  },
  {
    id: "grubhub",
    label: "Grubhub",
    iframeSrc: "/mock-portal-grubhub/disputes",
    accent: "ring-orange-500/40",
  },
];

type LineKind = "progress" | "escalate" | "fallback" | "complete";

interface ChannelState {
  status: "idle" | "running" | "complete";
  lines: { id: string; text: string; kind: LineKind }[];
  recoveredCents: number;
  filed: number;
}

const INITIAL: Record<Channel, ChannelState> = {
  doordash: { status: "idle", lines: [], recoveredCents: 0, filed: 0 },
  ubereats: { status: "idle", lines: [], recoveredCents: 0, filed: 0 },
  grubhub: { status: "idle", lines: [], recoveredCents: 0, filed: 0 },
};

export function LiveGrid() {
  const [state, setState] = useState<Record<Channel, ChannelState>>(INITIAL);
  const [running, setRunning] = useState(false);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!openedAt) return;
    const t = setInterval(() => setElapsedMs(Date.now() - openedAt), 200);
    return () => clearInterval(t);
  }, [openedAt]);

  const totalRecovered =
    state.doordash.recoveredCents +
    state.ubereats.recoveredCents +
    state.grubhub.recoveredCents;
  const totalFiled =
    state.doordash.filed + state.ubereats.filed + state.grubhub.filed;

  const handleEvent = useCallback((agent: AgentEvent) => {
    setState((prev) => {
      const cur = prev[agent.channel];
      const e = agent.event;
      let next: ChannelState = cur;

      switch (e.type) {
        case "STARTED":
          next = { ...cur, status: "running" };
          break;
        case "PROGRESS":
          next = {
            ...cur,
            status: "running",
            lines: [
              { id: `${e.runId}-${Date.now()}-${Math.random()}`, text: e.purpose, kind: "progress" as const },
              ...cur.lines,
            ].slice(0, 6),
          };
          break;
        case "STRATEGY_ESCALATED":
          next = {
            ...cur,
            lines: [
              {
                id: `${e.runId}-esc-${Date.now()}`,
                text: `Escalating to ${e.toMode} thinking — ${e.reason}`,
                kind: "escalate" as const,
              },
              ...cur.lines,
            ].slice(0, 6),
          };
          break;
        case "FALLBACK_ENGAGED":
          next = {
            ...cur,
            lines: [
              {
                id: `${e.runId}-fb-${Date.now()}`,
                text: `Fallback engaged: ${e.fallback.replace(/_/g, " ")} — ${e.reason}`,
                kind: "fallback" as const,
              },
              ...cur.lines,
            ].slice(0, 6),
          };
          break;
        case "COMPLETE": {
          const recovered =
            (e.result as { recovered_cents?: number } | undefined)
              ?.recovered_cents ?? 0;
          next = {
            ...cur,
            status: recovered > 0 ? "complete" : cur.status,
            recoveredCents: cur.recoveredCents + recovered,
            filed: recovered > 0 ? cur.filed + 1 : cur.filed,
            lines: [
              {
                id: `${e.runId}-c-${Date.now()}`,
                text:
                  recovered > 0
                    ? `Recovered $${(recovered / 100).toFixed(2)} on this charge`
                    : `Run ${e.status.toLowerCase()}`,
                kind: "complete" as const,
              },
              ...cur.lines,
            ].slice(0, 6),
          };
          break;
        }
        case "HEARTBEAT":
        case "STREAMING_URL":
        case "TF_API_RESULT":
        default:
          break;
      }

      return { ...prev, [agent.channel]: next };
    });
  }, []);

  const fireBatch = useCallback(async () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setState(INITIAL);
    setRunning(true);
    setOpenedAt(Date.now());
    setElapsedMs(0);

    try {
      await fetch("/api/live/fire-batch", { method: "POST" });
    } catch {
      // The SSE stream is fixture-driven so this failure is non-fatal.
    }

    const es = new EventSource("/api/live/stream");
    esRef.current = es;
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data);
        if (data && typeof data === "object" && "channel" in data) {
          handleEvent(data as AgentEvent);
        }
        if (data?.type === "close") {
          es.close();
          setRunning(false);
        }
      } catch {
        // ignore non-JSON
      }
    };
    es.onerror = () => {
      es.close();
      esRef.current = null;
      setRunning(false);
    };
  }, [handleEvent]);

  const reset = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setState(INITIAL);
    setRunning(false);
    setOpenedAt(null);
    setElapsedMs(0);
  }, []);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  return (
    <div>
      <div className="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Recovered this batch
            </div>
            <div className="mt-1">
              <DollarCounter cents={totalRecovered} className="text-4xl text-money" />
            </div>
          </div>
          <div className="hidden h-12 w-px bg-border/60 sm:block" />
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div>
              <span className="font-mono tabular-nums text-foreground">{totalFiled}</span>{" "}
              dispute{totalFiled === 1 ? "" : "s"} filed
            </div>
            <div>
              <span className="font-mono tabular-nums text-foreground">
                {(elapsedMs / 1000).toFixed(1)}s
              </span>{" "}
              elapsed
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={running && elapsedMs < 2000}>
            <RotateCcw className="size-4" /> Reset
          </Button>
          <Button size="sm" onClick={fireBatch} disabled={running}>
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Zap className="size-4" />
            )}
            {running ? "Running…" : "Fire batch"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {CHANNELS.map((c) => {
          const s = state[c.id];
          return (
            <div
              key={c.id}
              className={cn(
                "glass relative overflow-hidden rounded-2xl ring-1 ring-border",
                s.status === "running" && c.accent
              )}
            >
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 font-semibold uppercase tracking-widest">
                  <span
                    className={cn(
                      "inline-block size-2 rounded-full",
                      s.status === "running"
                        ? "animate-pulse bg-money"
                        : s.status === "complete"
                        ? "bg-money"
                        : "bg-muted-foreground/40"
                    )}
                  />
                  {c.label}
                </div>
                <div className="font-mono tabular-nums text-muted-foreground">
                  {s.filed} filed · ${(s.recoveredCents / 100).toFixed(2)}
                </div>
              </div>

              <div className="relative aspect-[4/3] w-full bg-white">
                <iframe
                  src={c.iframeSrc}
                  title={`${c.label} mock portal`}
                  className="absolute inset-0 h-full w-full"
                  sandbox="allow-same-origin allow-scripts"
                />

                <AnimatePresence>
                  {s.status !== "idle" && (
                    <motion.div
                      key="overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <AnimatePresence initial={false}>
                          {s.lines.slice(0, 4).map((line) => (
                            <motion.div
                              key={line.id}
                              layout
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className={cn(
                                "rounded-lg px-2.5 py-1.5 text-xs font-medium leading-snug backdrop-blur",
                                line.kind === "progress" && "bg-black/40 text-white",
                                line.kind === "escalate" &&
                                  "bg-amber-500/80 text-white",
                                line.kind === "fallback" &&
                                  "bg-orange-600/80 text-white",
                                line.kind === "complete" &&
                                  "bg-money/90 text-primary-foreground"
                              )}
                            >
                              {line.text}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {s.status === "idle" && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/40 to-transparent p-3 text-xs font-medium text-white">
                    <PlayCircle className="size-3.5" />
                    Awaiting batch
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Browser frames are Counter&apos;s mock portals — the same DOM contract a
        TinyFish run targets in production. The reasoning overlay is the live SSE
        stream Counter listens to from the agent.
      </p>
    </div>
  );
}
