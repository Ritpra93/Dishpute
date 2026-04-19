"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  CircleDollarSign,
  CornerDownRight,
  Loader2,
  PhoneOutgoing,
  Search,
  ShieldCheck,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarCounter } from "./dollar-counter";
import { MeritBadge } from "./merit-badge";
import { StatusBadge } from "./status-badge";
import { DisputeDetailSheet } from "./dispute-detail-sheet";
import {
  CONTINGENCY_FEE_RATE,
  DEMO_MERCHANT,
  type DashboardStats,
  type EnrichedDispute,
} from "@/lib/types";
import { formatCents, formatCentsPrecise, relativeTime } from "@/lib/utils";

interface Props {
  initialDisputes: EnrichedDispute[];
  initialStats: DashboardStats;
}

const CHARGE_TYPE_LABEL: Record<string, string> = {
  missing_item: "Missing item",
  wrong_item: "Wrong item",
  cold_food: "Cold food",
  order_never_arrived: "Not delivered",
  customer_cancel: "Customer cancel",
  unknown: "Other",
};

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

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {DEMO_MERCHANT.name} · {DEMO_MERCHANT.city}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Counter
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recover error charges from delivery platforms — automatically.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/trust"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="size-3.5" />
            Trust center
          </Link>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowUpRight className="size-3.5" />
            Connect payouts
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-money-soft">
          <CardHeader className="pb-1">
            <CardTitle className="text-money-soft-foreground">
              Recoverable submitted (last 14d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DollarCounter
              cents={stats.totalSubmittedRecoverableCents}
              className="text-4xl"
            />
            <p className="mt-1 text-xs text-money-soft-foreground/80">
              Across {stats.totalDisputed} of {stats.totalCharges} charges
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Realized</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums text-money">
              {formatCents(stats.totalRealizedCents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Counter fee ({(CONTINGENCY_FEE_RATE * 100).toFixed(0)}%) ·{" "}
              <span className="tabular-nums">
                {formatCentsPrecise(stats.counterFeeCents)}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>In flight</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {formatCents(stats.totalInFlightCents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {queueCount > 0
                ? `${queueCount} more ready to submit`
                : "Awaiting platform decision"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Denied · escalation eligible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {formatCents(stats.totalDeniedCents)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {escalateCandidates.length} disputes — voice agent ready
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
            All · {disputes.length}
          </FilterPill>
          <FilterPill active={filter === "queue"} onClick={() => setFilter("queue")}>
            Queue · {queueCount}
          </FilterPill>
          <FilterPill
            active={filter === "submitted"}
            onClick={() => setFilter("submitted")}
          >
            Submitted · {stats.totalDisputed}
          </FilterPill>
          <FilterPill
            active={filter === "denied"}
            onClick={() => setFilter("denied")}
          >
            Denied · {denied.length}
          </FilterPill>
          <FilterPill
            active={filter === "skipped"}
            onClick={() => setFilter("skipped")}
          >
            Skipped ·{" "}
            {disputes.filter((d) => d.classification?.shouldDispute === false).length}
          </FilterPill>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onScan}
            disabled={isScanning || isSubmittingAll}
          >
            {isScanning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Scan portal
          </Button>
          <Button
            variant="money"
            onClick={onSubmitAll}
            disabled={isSubmittingAll || isScanning || queueCount === 0}
          >
            {isSubmittingAll ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Submit all
          </Button>
        </div>
      </section>

      {isScanning && (
        <div className="mt-4">
          <Progress value={scanProgress} />
          <p className="mt-2 text-xs text-muted-foreground">
            Scraping DoorDash merchant portal…
          </p>
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Charge type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Merit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Charge</TableHead>
              <TableHead className="text-right">Recoverable</TableHead>
              <TableHead className="text-right">Charged</TableHead>
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
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      delay: Math.min(idx * 0.02, 0.3),
                      duration: 0.25,
                      ease: "easeOut",
                    }}
                    onClick={() => setActiveId(d.id)}
                    className={
                      "cursor-pointer border-b transition-colors hover:bg-muted/40 " +
                      (isApproved
                        ? "bg-money-soft/50 "
                        : isDenied
                          ? "border-l-4 border-l-destructive "
                          : "")
                    }
                  >
                    <td className="p-3 align-middle font-mono text-xs text-muted-foreground">
                      #{d.orderId.replace("ord_", "")}
                    </td>
                    <td className="p-3 align-middle text-sm">
                      {CHARGE_TYPE_LABEL[d.chargeType] ?? d.chargeType}
                    </td>
                    <td className="p-3 align-middle text-sm text-muted-foreground">
                      <span className="line-clamp-1">
                        {d.itemsReported.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                      </span>
                    </td>
                    <td className="p-3 align-middle">
                      {c ? <MeritBadge score={c.meritScore} /> : <span>—</span>}
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
                    <td className="p-3 text-right align-middle text-xs text-muted-foreground">
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
              Click <span className="font-medium text-foreground">Scan portal</span> to pull
              the latest from DoorDash.
            </p>
          </div>
        )}
      </section>

      {escalateCandidates.length > 0 && (
        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <PhoneOutgoing className="size-4" /> Voice escalation queue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                These disputes were denied by the platform but had merit ≥ 70. Counter
                will call the platform&apos;s support line and argue the case.
              </p>
              <div className="space-y-2">
                {escalateCandidates.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-md border bg-background p-3"
                  >
                    <div className="flex items-center gap-3">
                      <CornerDownRight className="size-3.5 text-muted-foreground" />
                      <div>
                        <p className="text-sm">
                          <span className="font-mono text-xs text-muted-foreground">
                            {d.id}
                          </span>{" "}
                          ·{" "}
                          {CHARGE_TYPE_LABEL[d.chargeType] ?? d.chargeType}{" "}
                          ·{" "}
                          <span className="tabular-nums">
                            {formatCentsPrecise(d.chargeAmountCents)}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.itemsReported.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="money"
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
              <p className="text-xs text-muted-foreground">
                Platform fee on recovered amounts is{" "}
                {(CONTINGENCY_FEE_RATE * 100).toFixed(0)}% — only paid on success.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

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

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
