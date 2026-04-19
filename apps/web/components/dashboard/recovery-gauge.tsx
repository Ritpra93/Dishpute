"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface RecoveryGaugeProps {
  value: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

/** Stable coords for SSR + browser (avoids float drift in cos/sin between runtimes). */
function roundSvg(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

export function RecoveryGauge({ value, label, sublabel, className }: RecoveryGaugeProps) {
  const TICKS = 28;
  const activeCount = Math.round(value * TICKS);
  const ticks = useMemo(() => Array.from({ length: TICKS }, (_, i) => i), []);

  return (
    <div className={cn("relative mx-auto aspect-[2/1] w-full max-w-[320px]", className)}>
      <svg viewBox="0 0 200 110" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="gauge-glow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.85 0.22 130)" />
            <stop offset="100%" stopColor="oklch(0.92 0.2 145)" />
          </linearGradient>
          <filter id="gauge-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.4" />
          </filter>
        </defs>
        {ticks.map((i) => {
          const t = i / (TICKS - 1);
          const angle = Math.PI * (1 - t);
          const cx = 100;
          const cy = 100;
          const rOuter = 92;
          const rInner = 64;
          const x1 = roundSvg(cx + Math.cos(angle) * rInner);
          const y1 = roundSvg(cy - Math.sin(angle) * rInner);
          const x2 = roundSvg(cx + Math.cos(angle) * rOuter);
          const y2 = roundSvg(cy - Math.sin(angle) * rOuter);
          const active = i < activeCount;
          return (
            <g key={i}>
              {active && (
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="url(#gauge-glow)"
                  strokeWidth={5}
                  strokeLinecap="round"
                  filter="url(#gauge-blur)"
                  opacity={0.9}
                />
              )}
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={active ? "url(#gauge-glow)" : "oklch(1 0 0 / 0.08)"}
                strokeWidth={4.2}
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-1">
        <div className="font-display text-3xl font-semibold tabular-nums text-foreground text-glow-lime">
          {Math.round(value * 100)}%
        </div>
        {label && (
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        )}
        {sublabel && (
          <div className="mt-0.5 text-[11px] text-muted-foreground/80">{sublabel}</div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-2 -bottom-1 flex justify-between text-[10px] text-muted-foreground/60 tabular-nums">
        <span>0</span><span>100</span>
      </div>
    </div>
  );
}
