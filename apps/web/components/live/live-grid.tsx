"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Wifi,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgentEvent } from "@/lib/types";

type Channel = "doordash" | "ubereats" | "grubhub";
type Stage = "connect" | "scan" | "inspect" | "file" | "recover" | "warn" | "escalate";

interface FeedEntry {
  id: string;
  channel: Channel;
  stage: Stage;
  text: string;
  orderId?: string;
  cents?: number;
  elapsedMs: number;
}

const PLATFORM: Record<Channel, { label: string; color: string; bg: string; dot: string }> = {
  doordash: { label: "DoorDash", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400" },
  ubereats:  { label: "Uber Eats", color: "text-emerald-400", bg: "bg-emerald-500/10", dot: "bg-emerald-400" },
  grubhub:   { label: "Grubhub", color: "text-orange-400", bg: "bg-orange-500/10", dot: "bg-orange-400" },
};

function StageIcon({ stage }: { stage: Stage }) {
  switch (stage) {
    case "connect":  return <Wifi className="size-3.5 text-muted-foreground/60" />;
    case "scan":     return <Search className="size-3.5 text-muted-foreground/60" />;
    case "inspect":  return <ClipboardList className="size-3.5 text-primary/70" />;
    case "file":     return <Send className="size-3.5 text-primary/70" />;
    case "recover":  return <CheckCircle2 className="size-3.5 text-money" />;
    case "warn":     return <AlertTriangle className="size-3.5 text-amber-400" />;
    case "escalate": return <ArrowUpCircle className="size-3.5 text-amber-400" />;
  }
}

function classifyPurpose(purpose: string): Stage {
  const p = purpose.toLowerCase();
  if (p.includes("loading") || p.includes("authenticating") || p.includes("navigating") || p.includes("connecting")) return "connect";
  if (p.includes("inspecting") || p.includes("reading customer") || p.includes("cross-check")) return "inspect";
  if (p.includes("filing") || p.includes("submitting")) return "file";
  return "scan";
}

function extractOrderId(text: string): string | undefined {
  const m = text.match(/#([A-Za-z0-9-]+)/);
  return m ? `#${m[1]}` : undefined;
}

function elapsedLabel(ms: number): string {
  const s = Math.floor(ms / 1000);
  const min = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

export function LiveGrid() {
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalScraped, setTotalScraped] = useState(0);
  const [totalFiled, setTotalFiled] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const openedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!openedAt) return;
    const t = setInterval(() => setElapsedMs(Date.now() - openedAt), 200);
    return () => clearInterval(t);
  }, [openedAt]);

  const pushEntry = useCallback((entry: Omit<FeedEntry, "id" | "elapsedMs">) => {
    const elapsedMs = openedAtRef.current ? Date.now() - openedAtRef.current : 0;
    setFeed((prev) => [
      { ...entry, id: `${entry.channel}-${Date.now()}-${Math.random()}`, elapsedMs },
      ...prev,
    ].slice(0, 80));
  }, []);

  const handleEvent = useCallback((agent: AgentEvent) => {
    const e = agent.event;
    const ch = agent.channel;

    switch (e.type) {
      case "STARTED":
        pushEntry({ channel: ch, stage: "connect", text: `Connecting to ${PLATFORM[ch].label} portal` });
        break;

      case "PROGRESS": {
        const stage = classifyPurpose(e.purpose);
        const orderId = extractOrderId(e.purpose);
        const text = e.purpose.replace(/ — (high-merit|item-missing pattern|extended evidence).*/, "");
        // Count any event that references a specific order as a "scraped" order
        if (orderId && (stage === "inspect" || stage === "scan")) {
          setTotalScraped((prev) => prev + 1);
        }
        pushEntry({ channel: ch, stage, text, orderId });
        break;
      }

      case "STRATEGY_ESCALATED":
        pushEntry({
          channel: ch,
          stage: "escalate",
          text: `Extended analysis — ${e.reason}`,
        });
        break;

      case "FALLBACK_ENGAGED":
        pushEntry({
          channel: ch,
          stage: "warn",
          text: `Fallback: ${e.fallback.replace(/_/g, " ")} — ${e.reason}`,
        });
        break;

      case "COMPLETE": {
        const cents = (e.result as { recovered_cents?: number } | undefined)?.recovered_cents ?? 0;
        const orderId = agent.candidateId ? `#${agent.candidateId.replace(/^disp_/, "").toUpperCase()}` : undefined;
        if (cents > 0) {
          pushEntry({ channel: ch, stage: "recover", text: `Dispute filed — $${(cents / 100).toFixed(2)} recoverable`, orderId, cents });
          setTotalFiled((prev) => prev + 1);
        } else {
          pushEntry({ channel: ch, stage: "file", text: `Dispute filed` });
          setTotalFiled((prev) => prev + 1);
        }
        break;
      }

      default:
        break;
    }
  }, [pushEntry]);

  const fireBatch = useCallback(async () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setFeed([]);
    setTotalScraped(0);
    setTotalFiled(0);
    setRunning(true);
    const now = Date.now();
    setOpenedAt(now);
    openedAtRef.current = now;
    setElapsedMs(0);

    try { await fetch("/api/live/fire-batch", { method: "POST" }); } catch { /* non-fatal */ }

    const es = new EventSource("/api/live/stream");
    esRef.current = es;
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data);
        if (data && "channel" in data) handleEvent(data as AgentEvent);
        if (data?.type === "close") { es.close(); setRunning(false); }
      } catch { /* ignore */ }
    };
    es.onerror = () => { es.close(); esRef.current = null; setRunning(false); };
  }, [handleEvent]);

  const reset = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setFeed([]);
    setTotalScraped(0);
    setTotalFiled(0);
    setRunning(false);
    setOpenedAt(null);
    openedAtRef.current = null;
    setElapsedMs(0);
  }, []);

  useEffect(() => () => { esRef.current?.close(); }, []);

  return (
    <div className="space-y-4">
      {/* Portal iframes — DoorDash + Uber Eats */}
      <div className="grid grid-cols-2 gap-3">
        {([
          { id: "doordash" as Channel, src: "/mock-portal/disputes" },
          { id: "ubereats" as Channel, src: "/mock-portal-ubereats/disputes" },
        ] as const).map(({ id, src }) => {
          const p = PLATFORM[id];
          const isActive = running;
          return (
            <div
              key={id}
              className={cn(
                "overflow-hidden rounded-2xl ring-1",
                isActive ? `ring-2` : "ring-border/40"
              )}
              style={isActive ? { boxShadow: `0 0 0 2px ${id === "doordash" ? "oklch(0.6 0.2 25 / 0.35)" : "oklch(0.55 0.15 145 / 0.35)"}` } : {}}
            >
              <div
                className={cn("flex items-center gap-2 px-3 py-2 text-[11px] font-semibold", p.bg)}
              >
                <span className={cn("size-1.5 rounded-full", isActive ? "animate-pulse" : "", p.dot)} />
                <span className={p.color}>{p.label}</span>
                {isActive && <span className="ml-auto text-[10px] text-muted-foreground">live agent</span>}
              </div>
              <div className="relative aspect-[16/9] bg-white">
                <iframe
                  src={src}
                  title={`${p.label} mock portal`}
                  className="absolute inset-0 h-full w-full"
                  sandbox="allow-same-origin allow-scripts"
                />
                {/* Scanning overlay when running */}
                {isActive && (
                  <div className="pointer-events-none absolute inset-0 border-2 border-transparent"
                    style={{
                      background: `linear-gradient(180deg, transparent 60%, ${id === "doordash" ? "oklch(0.6 0.2 25 / 0.08)" : "oklch(0.55 0.15 145 / 0.08)"} 100%)`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stat bar + controls */}
      <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Orders scraped</div>
            <div className="mt-0.5 text-3xl font-semibold tabular-nums text-foreground">
              {totalScraped}
            </div>
          </div>
          <div className="hidden h-10 w-px bg-border/60 sm:block" />
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>
              <span className="font-mono tabular-nums text-foreground">{totalFiled}</span> disputes filed
            </span>
            <span>
              <span className="font-mono tabular-nums text-foreground">{(elapsedMs / 1000).toFixed(1)}s</span> elapsed
            </span>
          </div>
          {running && (
            <>
              <div className="hidden h-10 w-px bg-border/60 sm:block" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {(["doordash", "ubereats", "grubhub"] as Channel[]).map((ch) => (
                  <span key={ch} className="flex items-center gap-1">
                    <span className={cn("inline-block size-1.5 rounded-full animate-pulse", PLATFORM[ch].dot)} />
                    <span className={PLATFORM[ch].color}>{PLATFORM[ch].label}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset} disabled={running && elapsedMs < 2000}>
            <RotateCcw className="size-4" /> Reset
          </Button>
          <Button size="sm" onClick={fireBatch} disabled={running}>
            {running ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
            {running ? "Scanning…" : "Fire batch"}
          </Button>
        </div>
      </div>

      {/* Activity feed */}
      <div
        className="glass min-h-[520px] overflow-hidden rounded-2xl"
        style={{ border: "1px solid oklch(1 0 0 / 0.07)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 border-b px-5 py-3"
          style={{ borderColor: "oklch(1 0 0 / 0.07)" }}
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Scrape activity
          </span>
          {running && (
            <span className="ml-auto flex items-center gap-1.5 text-[11px] text-money">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-money" />
              Live
            </span>
          )}
        </div>

        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-28 text-center">
            <div className="rounded-full bg-muted/30 p-3">
              <Search className="size-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground">
              Hit <span className="font-semibold text-foreground">Fire batch</span> to start scraping all three platforms.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Orders will appear here as they&apos;re found, classified, and filed.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            <AnimatePresence initial={false}>
              {feed.map((entry) => {
                const p = PLATFORM[entry.channel];
                const isRecover = entry.stage === "recover";
                const isWarn = entry.stage === "warn" || entry.stage === "escalate";
                const isConnect = entry.stage === "connect";
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={cn(
                      "flex items-center gap-3 px-5 py-2.5",
                      isConnect && "opacity-50",
                    )}
                  >
                    {/* Platform pill */}
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                        p.bg, p.color
                      )}
                    >
                      {p.label === "DoorDash" ? "DD" : p.label === "Uber Eats" ? "UE" : "GH"}
                    </span>

                    {/* Stage icon */}
                    <span className="shrink-0">
                      <StageIcon stage={entry.stage} />
                    </span>

                    {/* Main text */}
                    <span
                      className={cn(
                        "flex-1 truncate text-[13px]",
                        isRecover ? "font-semibold text-money" : isWarn ? "text-amber-300" : "text-foreground/80"
                      )}
                    >
                      {entry.text}
                    </span>

                    {/* Order ID badge */}
                    {entry.orderId && (
                      <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {entry.orderId}
                      </span>
                    )}

                    {/* Elapsed */}
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground/50">
                      {elapsedLabel(entry.elapsedMs)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
