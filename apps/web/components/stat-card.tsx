"use client";

import { cn } from "@/lib/utils";
import { useAnimatedNumber, formatMoney } from "@/lib/format";

interface StatCardProps {
  label: string;
  value: number;
  sublabel?: string;
  tone?: "default" | "money" | "danger" | "muted";
  format?: "money" | "number";
  icon?: React.ReactNode;
  pulse?: boolean;
  delta?: number;
}

export function StatCard({
  label,
  value,
  sublabel,
  tone = "default",
  format = "money",
  icon,
  pulse,
  delta,
}: StatCardProps) {
  const animated = useAnimatedNumber(value);
  const display =
    format === "money"
      ? formatMoney(animated)
      : Math.round(animated).toLocaleString();
  const positive = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        "glass relative overflow-hidden rounded-2xl p-5 transition-shadow",
        tone === "money" && "ring-1 ring-money/15",
        tone === "danger" && "ring-1 ring-denied-border/15",
        tone === "muted" && "opacity-95",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="flex items-center gap-1.5">
          {pulse && (
            <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse" />
          )}
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div
          className={cn(
            "font-display text-[32px] font-semibold leading-none tabular-nums tracking-tight text-foreground",
            tone === "money" && "text-money text-glow-lime",
          )}
        >
          {display}
        </div>
        {typeof delta === "number" && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              positive
                ? "bg-money-soft text-money"
                : "bg-denied-bg text-destructive",
            )}
          >
            {positive ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      {sublabel && (
        <div className="mt-1.5 text-xs text-muted-foreground">{sublabel}</div>
      )}
    </div>
  );
}
