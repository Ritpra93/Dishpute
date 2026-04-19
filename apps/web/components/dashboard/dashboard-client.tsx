"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  CircleDollarSign,
  Loader2,
  PhoneOutgoing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TopNav } from "@/components/top-nav";
import { WarningsFeed } from "@/components/warnings/warnings-feed";
import { FIXTURE_WARNINGS } from "@/lib/fixtures/warnings";
import { CostBadge } from "./cost-badge";
import { MeritBadge } from "./merit-badge";
import { StatusBadge } from "./status-badge";
import { PlatformPill, ChargeTypeLabel } from "./badges";
import { DisputeDetailSheet } from "./dispute-detail-sheet";
import { HeroCommand } from "./hero-command";
import {
  type DashboardStats,
  type EnrichedDispute,
} from "@/lib/types";
import { formatCentsPrecise, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  initialDisputes: EnrichedDispute[];
  initialStats: DashboardStats;
}

type Filter = "all" | "queue" | "submitted" | "denied" | "skipped";

export function DashboardClient({ initialDisputes, initialStats }: Props) {
  const router = useRouter();
  const [disputes, setDisputes] = useState(initialDisputes);
  const [stats, setStats] = useState(initialStats);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [calledIds, setCalledIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    const [d, s] = await Promise.all([
      fetch("/api/disputes", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/stats", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setDisputes(d);
    setStats(s);
    startTransition(() => router.refresh());
  }, [router]);

  const onScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(8);
    const tick = setInterval(() => {
      setScanProgress((p) => (p < 90 ? p + Math.random() * 12 : p));
    }, 400);
    try {
      await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform: "doordash", reset: true }),
      });
      setScanProgress(100);
      await refresh();
    } finally {
      clearInterval(tick);
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
      }, 600);
    }
  }, [refresh]);

  const onSubmitAll = useCallback(async () => {
    setIsSubmittingAll(true);
    try {
      await fetch("/api/disputes/submit-all", { method: "POST" });
      await refresh();
    } finally {
      setIsSubmittingAll(false);
    }
  }, [refresh]);

  const onEscalate = useCallback(
    async (id: string) => {
      // Guard: only one call per dispute
      if (calledIds.has(id)) return;
      setEscalatingId(id);
      try {
        await fetch(`/api/disputes/${id}/escalate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "platform_denied" }),
        });
        setCalledIds((prev) => new Set([...prev, id]));
        await refresh();
      } finally {
        setEscalatingId(null);
      }
    },
    [refresh, calledIds]
  );

  const active = useMemo(
    () => disputes.find((d) => d.id === activeId) ?? null,
    [disputes, activeId]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "queue":
        return disputes.filter(
          (d) => d.classification?.shouldDispute && !d.submission
        );
      case "submitted":
        return disputes.filter((d) => d.submission?.status === "submitted");
      case "denied":
        return disputes.filter((d) => d.outcome?.outcome === "denied");
      case "skipped":
        return disputes.filter((d) => d.classification?.shouldDispute === false);
      default:
        return disputes;
    }
  }, [disputes, filter]);

  const denied = disputes.filter((d) => d.outcome?.outcome === "denied");
  const escalateCandidates = denied.filter((d) => d.outcome?.escalateToVoice);
  const queueCount = disputes.filter(
    (d) => d.classification?.shouldDispute && !d.submission
  ).length;


  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-[1320px] px-7 py-4">
        {/* HeroCommand — 3-column dense above-the-fold command center */}
        <HeroCommand
          stats={stats}
          queueCount={queueCount}
          deniedCount={denied.length}
          isScanning={isScanning}
          isSubmittingAll={isSubmittingAll}
          onScan={onScan}
          onSubmitAll={onSubmitAll}
        />

        {/* Filter tab underline rail */}
        {(() => {
          const tabs: [Filter, string, number][] = [
            ["all", "All", disputes.length],
            ["queue", "Queue", queueCount],
            ["submitted", "Submitted", stats.totalDisputed],
            ["denied", "Denied", denied.length],
            ["skipped", "Skipped", disputes.filter((d) => d.classification?.shouldDispute === false).length],
          ];
          return (
            <div className="mt-8 flex items-end justify-between gap-3 border-b border-border">
              <div className="flex gap-0">
                {tabs.map(([k, l, n]) => (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className="relative px-[18px] py-3 pb-3.5 text-[13px]"
                    style={{
                      color: filter === k ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                      fontWeight: filter === k ? 500 : 400,
                      background: "transparent",
                      border: 0,
                      cursor: "pointer",
                    }}
                  >
                    {l}
                    <span
                      style={{
                        color: filter === k ? "var(--color-muted-foreground)" : "oklch(1 0 0 / 0.2)",
                        marginLeft: 6,
                        fontSize: 12,
                      }}
                    >
                      {n}
                    </span>
                    {filter === k && (
                      <span
                        className="absolute bottom-[-1px] left-[14px] right-[14px] h-[2px] rounded-full"
                        style={{
                          background: "linear-gradient(90deg, oklch(0.72 0.15 45) 0%, oklch(0.82 0.16 75) 100%)",
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2.5 pb-3 text-[12px] text-muted-foreground">
                <span style={{ fontFamily: '"Newsreader",Georgia,serif', fontStyle: "italic" }}>
                  Sorted by
                </span>
                <span className="text-foreground text-[13px]">Recoverable, high → low</span>
              </div>
            </div>
          );
        })()}

        {isScanning && (
          <div className="glass mt-4 h-1.5 overflow-hidden rounded-full p-0">
            <Progress value={scanProgress} className="h-full rounded-full border-none bg-transparent [&>div]:rounded-full [&>div]:bg-primary" />
          </div>
        )}

        {/* Disputes table — no card wrapper, hairline only */}
        <div className="mt-3 overflow-hidden max-h-[30vh] overflow-y-auto" style={{ border: "1px solid oklch(1 0 0 / 0.07)", borderRadius: 16 }}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent" style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
                <TableHead
                  className="pl-5"
                  style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}
                >
                  Order
                </TableHead>
                <TableHead style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
                  Charge type
                </TableHead>
                <TableHead style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
                  Items
                </TableHead>
                <TableHead style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
                  Merit
                </TableHead>
                <TableHead style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
                  Status
                </TableHead>
                <TableHead className="text-right" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
                  Charge
                </TableHead>
                <TableHead className="text-right" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
                  Recoverable
                </TableHead>
                <TableHead className="pr-5 text-right" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
                  Charged
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence initial={false}>
                {filtered.map((d, idx) => {
                  const c = d.classification;
                  const isApproved = d.outcome?.outcome === "approved";
                  const isDenied = d.outcome?.outcome === "denied";
                  return (
                    <motion.tr
                      key={d.id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        delay: Math.min(idx * 0.012, 0.3),
                        duration: 0.25,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onClick={() => setActiveId(d.id)}
                      className={cn(
                        "animate-row-in cursor-pointer transition-colors hover:bg-white/[0.02]",
                        d.classification?.shouldDispute === false && "opacity-50",
                      )}
                      style={{
                        borderBottom: "1px solid oklch(1 0 0 / 0.05)",
                        borderLeft: isApproved
                          ? "3px solid oklch(0.82 0.16 75 / 0.6)"
                          : isDenied
                          ? "3px solid oklch(0.68 0.18 28 / 0.7)"
                          : "3px solid transparent",
                        animationDelay: `${Math.min(idx * 12, 300)}ms`,
                      }}
                    >
                      <td className="p-3 pl-4 align-middle">
                        <div className="flex flex-col">
                          <span className="font-medium tabular-nums">#{d.orderId.replace("ord_", "")}</span>
                          <PlatformPill platform={d.platform} />
                        </div>
                      </td>
                      <td className="p-3 align-middle">
                        <ChargeTypeLabel type={d.chargeType} />
                      </td>
                      <td className="p-3 align-middle max-w-[220px] truncate text-sm text-muted-foreground">
                        {d.itemsReported.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </td>
                      <td className="p-3 align-middle">
                        {c ? <MeritBadge score={c.meritScore} /> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="p-3 align-middle">
                        <StatusBadge dispute={d} />
                      </td>
                      <td className="p-3 text-right align-middle text-sm tabular-nums">
                        {formatCentsPrecise(d.chargeAmountCents)}
                      </td>
                      <td className="p-3 text-right align-middle text-sm font-medium tabular-nums text-money">
                        {c ? formatCentsPrecise(c.recoverableCents) : "—"}
                      </td>
                      <td className="p-3 pr-5 text-right align-middle text-xs text-muted-foreground">
                        {relativeTime(d.chargeTimestamp)}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
              <CircleDollarSign className="size-6 opacity-40" />
              <p>No disputes in this view yet.</p>
              <p>
                Click <span className="font-medium text-foreground">Scan portal</span> to pull the latest from DoorDash.
              </p>
            </div>
          )}
        </div>

        {/* Pre-dispute early warnings & Voice escalation */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="glass rounded-xl p-4 max-h-[22vh] overflow-y-auto">
            <div className="mb-2 flex items-center justify-between sticky top-0 bg-card z-10 pb-2 border-b border-border/20">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Early warnings
              </div>
              <Link
                href="/warnings"
                className="text-[10px] font-semibold text-money hover:underline"
              >
                See all →
              </Link>
            </div>
            <WarningsFeed
              initial={FIXTURE_WARNINGS.slice(0, 3)}
              live={false}
              variant="compact"
            />
          </div>

          {denied.length > 0 ? (
            <div className="glass rounded-xl p-4 ring-1 ring-denied-border/20 max-h-[22vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-4 sticky top-0 bg-card z-10 pb-2 border-b border-border/20 mb-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <PhoneOutgoing className="size-3" /> Voice escalation queue
                  </div>
                </div>
                {escalateCandidates.length === 0 && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => denied[0] && setActiveId(denied[0].id)}>
                    Review
                  </Button>
                )}
              </div>
              {escalateCandidates.length > 0 && (
                <div className="space-y-1.5">
                  {escalateCandidates.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-denied-border/10 bg-card/50 p-2">
                      <div>
                        <p className="text-[11px] font-medium">
                          #{d.orderId.replace("ord_", "")} · {formatCentsPrecise(d.chargeAmountCents)}
                        </p>
                      </div>
                      {calledIds.has(d.id) ? (
                        <span className="text-[10px] text-muted-foreground px-2">Calling…</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-6 text-[10px] px-2"
                          onClick={() => onEscalate(d.id)}
                          disabled={escalatingId === d.id}
                        >
                          {escalatingId === d.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <PhoneOutgoing className="size-3" />
                          )}
                          Call
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
             <div className="glass rounded-xl p-4 flex items-center justify-center text-xs text-muted-foreground">
               No pending escalations
             </div>
          )}
        </div>

        <footer className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-border/40 pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <div>
            Counter is API-proof — we drive the same browser the merchant does.{" "}
            <Link
              href="/why"
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Why this matters →
            </Link>
          </div>
          <div className="flex gap-4">
            <Link href="/why" className="hover:text-foreground">Why Counter</Link>
            <Link href="/trust" className="hover:text-foreground">Trust</Link>
          </div>
        </footer>
      </main>

      <DisputeDetailSheet
        dispute={active}
        open={!!activeId}
        onOpenChange={(o) => !o && setActiveId(null)}
        onEscalate={onEscalate}
        isEscalating={escalatingId !== null}
      />

      <CostBadge />
    </div>
  );
}
