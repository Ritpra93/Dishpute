"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, ChevronDown, Sparkles, X } from "lucide-react";
import type { SessionCost } from "@counter/types";

interface SnapshotMsg {
  type: "snapshot";
  cost: SessionCost;
}
interface TickMsg {
  type: "tick";
  cost: SessionCost;
}
type Msg = SnapshotMsg | TickMsg | { type: "heartbeat" };

function fmtUsd(microcents: number): string {
  const usd = microcents / 1_000_000;
  if (usd < 0.001) return `$${(usd * 1000).toFixed(3)}m`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(3)}`;
}

export function CostBadge() {
  const [cost, setCost] = useState<SessionCost | null>(null);
  const [pulse, setPulse] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/cost/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data) as Msg;
        if (data.type === "snapshot" || data.type === "tick") {
          setCost(data.cost);
          if (data.type === "tick") {
            setPulse(true);
            setTimeout(() => setPulse(false), 700);
          }
        }
      } catch {
        // ignore
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  if (!cost) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <motion.div
            key="open"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="glass w-72 rounded-2xl border p-4 shadow-lg"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Activity className="size-3.5" />
                Session cost
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="text-2xl font-semibold tabular-nums text-foreground">
              {fmtUsd(cost.totalMicrocents)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              across {cost.callCount} call{cost.callCount === 1 ? "" : "s"} ·
              cache-hit {(cost.cacheHitRate * 100).toFixed(0)}%
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-[11px]">
              <Row k="Input" v={cost.totalInputTokens.toLocaleString()} />
              <Row k="Output" v={cost.totalOutputTokens.toLocaleString()} />
              <Row k="Cache read" v={cost.totalCacheReadTokens.toLocaleString()} />
              <Row k="Cache write" v={cost.totalCacheCreationTokens.toLocaleString()} />
            </dl>
            <button
              className="mt-3 w-full rounded-lg border border-dashed border-border px-3 py-1.5 text-[11px] text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              onClick={async () => {
                await fetch("/api/cost/demo-tick", { method: "POST" });
              }}
            >
              + Simulate classifier call
            </button>
          </motion.div>
        ) : (
          <motion.button
            key="closed"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-md hover:border-foreground/40"
          >
            <Activity className="size-3.5 text-primary" />
            <span className="text-muted-foreground">Session</span>
            <span className="font-semibold tabular-nums">
              {fmtUsd(cost.totalMicrocents)}
            </span>
            <AnimatePresence>
              {pulse && (
                <motion.span
                  key="pulse"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="inline-flex items-center text-money"
                >
                  <Sparkles className="size-3" />
                </motion.span>
              )}
            </AnimatePresence>
            <ChevronDown className="size-3 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right tabular-nums">{v}</dd>
    </>
  );
}
