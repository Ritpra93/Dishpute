"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  CircleDollarSign,
  Loader2,
  PhoneOutgoing,
  Search,
  Send,
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
import { StatCard } from "@/components/stat-card";
import { DollarCounter } from "./dollar-counter";
import { MeritBadge } from "./merit-badge";
import { StatusBadge } from "./status-badge";
import { PlatformPill, ChargeTypeLabel } from "./badges";
import { DisputeDetailSheet } from "./dispute-detail-sheet";
import { SpectrumStrip } from "./spectrum-strip";
import { RecoveryGauge } from "./recovery-gauge";
import { RecoveryAreaChart } from "./recovery-area-chart";
import {
  CONTINGENCY_FEE_RATE,
  DEMO_MERCHANT,
  type DashboardStats,
  type EnrichedDispute,
} from "@/lib/types";
import { formatCents, formatCentsPrecise, relativeTime } from "@/lib/utils";
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
      setEscalatingId(id);
      setActiveId(id);
      try {
        await fetch(`/api/disputes/${id}/escalate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: "platform_denied" }),
        });
        await refresh();
      } finally {
        setEscalatingId(null);
      }
    },
    [refresh]
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

  const realizedDollars = stats.totalRealizedCents / 100;
  const inFlightDollars = stats.totalInFlightCents / 100;
  const deniedDollars = stats.totalDeniedCents / 100;
  const recoveryRate = stats.totalRealizedCents / Math.max(stats.totalSubmittedRecoverableCents, 1);

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-1">
          <div className="text-xs font-medium uppercase tracking-wider text-foreground/60">
            {DEMO_MERCHANT.name} · {DEMO_MERCHANT.city}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Counter
          </h1>
          <p className="text-sm text-foreground/70">
            We watch your delivery platforms, dispute every error charge, and recover the money for you.
          </p>
        </div>

        {/* Hero dollar counter + stat cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass relative overflow-hidden rounded-2xl p-5 ring-1 ring-money/30 sm:col-span-2 lg:col-span-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recoverable submitted
            </div>
            <div className="mt-3">
              <DollarCounter cents={stats.totalSubmittedRecoverableCents} className="text-4xl text-money" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Across {stats.totalDisputed} of {stats.totalCharges} charges
            </p>
          </div>

          <StatCard
            label="Realized this period"
            value={realizedDollars}
            tone="money"
            delta={8}
            sublabel={`Counter fee (${(CONTINGENCY_FEE_RATE * 100).toFixed(0)}%) · ${formatCentsPrecise(stats.counterFeeCents)}`}
          />
          <StatCard
            label="In flight"
            value={inFlightDollars}
            tone="muted"
            delta={3}
            sublabel={
              queueCount > 0
                ? `${queueCount} more ready to submit`
                : "Awaiting platform decision"
            }
          />
          <StatCard
            label="Denied · needs voice"
            value={deniedDollars}
            tone="danger"
            delta={-4}
            sublabel={`${escalateCandidates.length} cases ready to escalate`}
          />
        </div>

        {/* Charge breakdown spectrum strip */}
        <div className="mt-3">
          <SpectrumStrip />
        </div>

        {/* Recovery gauge + area chart */}
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="glass rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Recovery rate
                </div>
                <div className="mt-0.5 text-sm text-foreground/80">Realized vs submitted</div>
              </div>
              <span className="rounded-full bg-money-soft px-2.5 py-1 text-[11px] font-semibold text-money-soft-foreground">
                Live
              </span>
            </div>
            <div className="mt-4">
              <RecoveryGauge
                value={recoveryRate}
                label="recovered of submitted"
                sublabel={`${formatCents(stats.totalRealizedCents)} of ${formatCents(stats.totalSubmittedRecoverableCents)}`}
              />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
              <div className="glass-soft rounded-xl px-3 py-2">
                <div className="text-muted-foreground">Auto-submitted</div>
                <div className="mt-0.5 font-medium tabular-nums text-foreground">
                  {stats.totalDisputed} / {stats.totalCharges}
                </div>
              </div>
              <div className="glass-soft rounded-xl px-3 py-2">
                <div className="text-muted-foreground">Avg cycle time</div>
                <div className="mt-0.5 font-medium tabular-nums text-foreground">1.4 days</div>
              </div>
              <div className="glass-soft rounded-xl px-3 py-2">
                <div className="text-muted-foreground">Voice success</div>
                <div className="mt-0.5 font-medium tabular-nums text-money">62%</div>
              </div>
              <div className="glass-soft rounded-xl px-3 py-2">
                <div className="text-muted-foreground">Platforms</div>
                <div className="mt-0.5 font-medium tabular-nums text-foreground">3 connected</div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-5 lg:col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Recovered, last 14 days
                </div>
                <div className="mt-0.5 font-display text-2xl font-semibold tabular-nums text-foreground text-glow-lime">
                  {formatCents(stats.totalRealizedCents)}
                </div>
              </div>
              <div className="flex gap-1 rounded-full bg-accent/60 p-1 text-[11px]">
                {(["1D", "1W", "1M", "3M"] as const).map((p, i) => (
                  <button
                    key={p}
                    className={cn(
                      "rounded-full px-2.5 py-1 transition-colors",
                      i === 1
                        ? "bg-money text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3">
              <RecoveryAreaChart />
            </div>
          </div>
        </div>

        {/* Filter pills + action buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="glass flex flex-wrap gap-1 rounded-full p-1">
            {(
              [
                ["all", `All · ${disputes.length}`],
                ["queue", `Queue · ${queueCount}`],
                ["submitted", `Submitted · ${stats.totalDisputed}`],
                ["denied", `Denied · ${denied.length}`],
                ["skipped", `Skipped · ${disputes.filter((d) => d.classification?.shouldDispute === false).length}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  filter === k
                    ? "bg-money text-primary-foreground glow-lime"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onScan} disabled={isScanning || isSubmittingAll}>
              {isScanning ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              {isScanning ? `Scanning… ${Math.round(scanProgress)}%` : "Scan portal"}
            </Button>
            <Button size="sm" onClick={onSubmitAll} disabled={isSubmittingAll || isScanning || queueCount === 0}>
              {isSubmittingAll ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {isSubmittingAll ? "Submitting…" : "Submit all"}
            </Button>
          </div>
        </div>

        {isScanning && (
          <div className="glass mt-4 h-1.5 overflow-hidden rounded-full p-0">
            <Progress value={scanProgress} className="h-full rounded-full border-none bg-transparent [&>div]:rounded-full [&>div]:bg-primary" />
          </div>
        )}

        {/* Disputes table */}
        <div className="glass mt-6 overflow-hidden rounded-2xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Order</TableHead>
                <TableHead>Charge type</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Merit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Charge</TableHead>
                <TableHead className="text-right">Recoverable</TableHead>
                <TableHead className="pr-5 text-right">Charged</TableHead>
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
                        ease: "easeOut",
                      }}
                      onClick={() => setActiveId(d.id)}
                      className={cn(
                        "animate-row-in cursor-pointer border-white/5 transition-colors hover:bg-black/[0.02]",
                        isApproved && "bg-approved-bg/30",
                        isDenied && "border-l-2 border-l-denied-border bg-denied-bg/30",
                        d.classification?.shouldDispute === false && "opacity-50",
                      )}
                      style={{ animationDelay: `${Math.min(idx * 12, 300)}ms` }}
                    >
                      <td className="p-3 pl-5 align-middle">
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

        {/* Voice escalation queue */}
        {denied.length > 0 && (
          <div className="glass mt-6 rounded-2xl p-5 ring-1 ring-denied-border/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <PhoneOutgoing className="size-4" /> Voice escalation queue
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {denied.length} denied dispute{denied.length === 1 ? "" : "s"} totaling{" "}
                  <span className="font-medium text-foreground">
                    {formatCents(stats.totalDeniedCents)}
                  </span>{" "}
                  are eligible for voice escalation.
                </p>
                {escalateCandidates.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {escalateCandidates.map((d) => (
                      <div key={d.id} className="flex items-center justify-between rounded-xl border border-denied-border/20 bg-card p-3">
                        <div>
                          <p className="text-sm font-medium">
                            #{d.orderId.replace("ord_", "")} · {formatCentsPrecise(d.chargeAmountCents)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {d.itemsReported.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => onEscalate(d.id)}
                          disabled={escalatingId === d.id}
                        >
                          {escalatingId === d.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <PhoneOutgoing className="size-3.5" />
                          )}
                          Call platform
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {escalateCandidates.length === 0 && (
                <Button onClick={() => denied[0] && setActiveId(denied[0].id)}>
                  Review &amp; call
                </Button>
              )}
            </div>
          </div>
        )}
      </main>

      <DisputeDetailSheet
        dispute={active}
        open={!!activeId}
        onOpenChange={(o) => !o && setActiveId(null)}
        onEscalate={onEscalate}
        isEscalating={escalatingId !== null}
      />
    </div>
  );
}
