"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, Clock, FileText, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidencePreviewDialog } from "@/components/dashboard/evidence-preview-dialog";
import { cn } from "@/lib/utils";
import type { EarlyWarning, EarlyWarningSeverity } from "@/lib/types";

interface Props {
  initial?: EarlyWarning[];
  /** When true, subscribe to the SSE feed for live appends. */
  live?: boolean;
  className?: string;
  variant?: "full" | "compact";
}

const SEV_LABEL: Record<EarlyWarningSeverity, string> = {
  imminent: "Imminent",
  watch: "Watch",
  info: "Info",
};

const SEV_CLASS: Record<EarlyWarningSeverity, string> = {
  imminent: "bg-denied-bg text-denied-border ring-denied-border/30",
  watch: "bg-amber-500/10 text-amber-700 ring-amber-500/30",
  info: "bg-muted text-muted-foreground ring-border",
};

const SEV_ICON: Record<EarlyWarningSeverity, typeof ShieldCheck> = {
  imminent: AlertTriangle,
  watch: ShieldAlert,
  info: ShieldCheck,
};

function fmtMoney(c: number): string {
  return `$${(c / 100).toFixed(2)}`;
}

function fmtRelativeFromNow(iso: string): string {
  const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(diffMin) < 1) return "now";
  if (diffMin > 0) {
    if (diffMin < 60) return `in ${diffMin}m`;
    return `in ${Math.round(diffMin / 60)}h`;
  }
  const ago = -diffMin;
  if (ago < 60) return `${ago}m ago`;
  return `${Math.round(ago / 60)}h ago`;
}

/** Avoids hydration mismatch: `Date.now()` differs between SSR and client. */
function RelativeFromNow({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setLabel(fmtRelativeFromNow(iso));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [iso]);
  return <span className="tabular-nums">{label ?? "…"}</span>;
}

export function WarningsFeed({
  initial = [],
  live = true,
  className,
  variant = "full",
}: Props) {
  const [items, setItems] = useState<EarlyWarning[]>(initial);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    const es = new EventSource("/api/warnings/stream");
    es.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data);
        if (data?.type === "warning" && data.warning) {
          setItems((prev) => {
            if (prev.find((p) => p.id === (data.warning as EarlyWarning).id)) return prev;
            return [data.warning as EarlyWarning, ...prev];
          });
        }
      } catch {
        // ignore
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [live]);

  const totalRecoverable = items.reduce((s, w) => s + w.potentialChargeCents, 0);

  return (
    <div className={cn("space-y-3", className)}>
      {variant === "full" && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-mono tabular-nums text-foreground">{items.length}</span>{" "}
            open · <span className="font-mono tabular-nums text-money">{fmtMoney(totalRecoverable)}</span>{" "}
            at risk
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className="size-2 animate-pulse rounded-full bg-money" />
            Live
          </span>
        </div>
      )}

      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((w) => {
            const Icon = SEV_ICON[w.severity];
            const candidateForPreview = w.artifactIds?.[0];
            return (
              <motion.li
                key={w.id}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "rounded-xl border border-border bg-card p-3 text-sm",
                  variant === "compact" && "p-2.5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1",
                      SEV_CLASS[w.severity]
                    )}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{w.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className={cn("rounded-full px-1.5 py-0.5 font-semibold uppercase tracking-wider ring-1", SEV_CLASS[w.severity])}>
                            {SEV_LABEL[w.severity]}
                          </span>
                          <span className="capitalize">{w.platform}</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3" />
                            <RelativeFromNow iso={w.expectedAt} />
                          </span>
                          {w.potentialChargeCents > 0 && (
                            <span className="font-mono tabular-nums text-foreground">
                              {fmtMoney(w.potentialChargeCents)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {variant === "full" && (
                      <p className="mt-2 text-xs text-muted-foreground">{w.detail}</p>
                    )}
                    {candidateForPreview && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewId(candidateForPreview)}
                        >
                          <FileText className="size-3.5" />
                          Pre-staged evidence
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          No active warnings.
        </p>
      )}

      {previewId && (
        <EvidencePreviewDialog
          disputeId={previewId}
          open={!!previewId}
          onOpenChange={(o) => !o && setPreviewId(null)}
        />
      )}
    </div>
  );
}
