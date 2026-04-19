"use client";

import { Loader2, Search, Send } from "lucide-react";
import { DollarCounter } from "./dollar-counter";
import type { DashboardStats } from "@/lib/types";

interface HeroCommandProps {
  stats: DashboardStats;
  queueCount: number;
  deniedCount: number;
  isScanning: boolean;
  isSubmittingAll: boolean;
  onScan: () => void;
  onSubmitAll: () => void;
}

// Simple sparkline SVG built from recent recovery data
function Sparkline() {
  const points = [12, 19, 14, 28, 22, 35, 30, 48, 42, 58, 52, 68, 72, 89];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const polyline = coords.join(" ");
  const area = `0,${h} ${polyline} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="overflow-visible">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.16 75)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="oklch(0.82 0.16 75)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkGrad)" />
      <polyline points={polyline} stroke="oklch(0.82 0.16 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// AmberGauge: arc of tick marks, terracotta→amber gradient fill up to value
function AmberGauge({ value }: { value: number }) {
  const TICKS = 34;
  const START_ANGLE = -210;
  const SWEEP = 240;
  const R = 52;
  const cx = 64;
  const cy = 64;

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const angle = START_ANGLE + (SWEEP / (TICKS - 1)) * i;
    const rad = (angle * Math.PI) / 180;
    const filled = i / (TICKS - 1) <= value;
    const innerR = filled ? R - 8 : R - 5;
    const outerR = R;
    const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
    const x1 = r4(cx + innerR * Math.cos(rad));
    const y1 = r4(cy + innerR * Math.sin(rad));
    const x2 = r4(cx + outerR * Math.cos(rad));
    const y2 = r4(cy + outerR * Math.sin(rad));
    return { x1, y1, x2, y2, filled };
  });

  const pct = Math.round(value * 100);

  return (
    <div className="flex flex-col items-center">
      <svg width={128} height={110} viewBox="0 0 128 120">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.72 0.15 45)" />
            <stop offset="100%" stopColor="oklch(0.82 0.16 75)" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.filled ? "url(#gaugeGrad)" : "oklch(1 0 0 / 0.1)"}
            strokeWidth={t.filled ? 2.5 : 1.5}
            strokeLinecap="round"
          />
        ))}
        <text
          x={cx}
          y={cy + 8}
          textAnchor="middle"
          fill="oklch(0.97 0.01 80)"
          fontSize="20"
          fontWeight="600"
          fontFamily="Newsreader, Georgia, serif"
          letterSpacing="-0.02em"
        >
          {pct}%
        </text>
        <text
          x={cx}
          y={cy + 24}
          textAnchor="middle"
          fill="oklch(0.62 0.018 65)"
          fontSize="8"
          fontFamily="Geist, sans-serif"
          letterSpacing="0.05em"
        >
          RECOVERY
        </text>
      </svg>
    </div>
  );
}

const TICKER_ITEMS = [
  { label: "Masala Dosa ×2 disputed", amount: "+$24.00", time: "2m ago" },
  { label: "Chicken Biryani classified", amount: "$38.50", time: "4m ago" },
  { label: "Idli Sambar auto-submitted", amount: "+$16.00", time: "6m ago" },
  { label: "Vada ×3 merit scored 94", amount: "$22.00", time: "9m ago" },
  { label: "Masala Dosa ×2 disputed", amount: "+$24.00", time: "2m ago" },
  { label: "Chicken Biryani classified", amount: "$38.50", time: "4m ago" },
  { label: "Idli Sambar auto-submitted", amount: "+$16.00", time: "6m ago" },
  { label: "Vada ×3 merit scored 94", amount: "$22.00", time: "9m ago" },
];

const PLATFORM_PILLS = [
  { label: "DoorDash", color: "oklch(0.72 0.18 28)", pct: 68 },
  { label: "UberEats", color: "oklch(0.72 0.18 140)", pct: 22 },
  { label: "Grubhub", color: "oklch(0.72 0.18 290)", pct: 10 },
];

export function HeroCommand({
  stats,
  queueCount,
  deniedCount,
  isScanning,
  isSubmittingAll,
  onScan,
  onSubmitAll,
}: HeroCommandProps) {
  const recoveryRate = stats.totalRealizedCents / Math.max(stats.totalSubmittedRecoverableCents, 1);
  const inFlightCount = stats.totalInFlightCents > 0 ? Math.ceil(stats.totalInFlightCents / 3000) : 0;

  return (
    <div
      className="grid grid-cols-3 gap-0 overflow-hidden rounded-[22px]"
      style={{
        background: "oklch(0.21 0.014 55)",
        border: "1px solid oklch(0.7 0.13 55 / 0.2)",
        boxShadow: "0 8px 40px -8px oklch(0 0 0 / 0.4), 0 1px 2px oklch(0 0 0 / 0.2)",
      }}
    >
      {/* Column 1: Money counter + sparkline + CTAs */}
      <div
        className="flex flex-col gap-4 p-6"
        style={{ borderRight: "1px solid oklch(1 0 0 / 0.06)" }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontStyle: "italic",
            fontSize: 11,
            letterSpacing: "0.04em",
            color: "oklch(0.62 0.018 65)",
            textTransform: "uppercase",
          }}
        >
          House of Curry · Minneapolis
        </div>

        {/* Giant money counter */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "oklch(0.62 0.018 65)",
              marginBottom: 4,
            }}
          >
            Recoverable submitted
          </div>
          <DollarCounter
            cents={stats.totalSubmittedRecoverableCents}
            className="text-4xl"
          />
          {/* +18% pill */}
          <div
            className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5"
            style={{
              background: "oklch(0.82 0.16 75 / 0.14)",
              fontSize: 11,
              fontWeight: 600,
              color: "oklch(0.86 0.15 75)",
            }}
          >
            <span>↑</span>
            <span>18% this week</span>
          </div>
        </div>

        {/* Sparkline */}
        <div>
          <Sparkline />
          <div
            style={{
              fontSize: 10,
              color: "oklch(0.62 0.018 65)",
              marginTop: 4,
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            Last 14 days
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={onScan}
            disabled={isScanning || isSubmittingAll}
            className="flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-50"
            style={{
              background: "oklch(0.28 0.018 55)",
              color: "oklch(0.97 0.01 80)",
              border: "1px solid oklch(1 0 0 / 0.1)",
              cursor: isScanning || isSubmittingAll ? "not-allowed" : "pointer",
            }}
          >
            {isScanning ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Search size={14} />
            )}
            {isScanning ? `Scanning… ` : "Scan portal"}
          </button>
          <button
            onClick={onSubmitAll}
            disabled={isSubmittingAll || isScanning || queueCount === 0}
            className="flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, oklch(0.72 0.15 45), oklch(0.60 0.13 38))",
              color: "oklch(0.18 0.02 45)",
              boxShadow: "0 2px 12px oklch(0.72 0.15 45 / 0.3)",
              cursor: isSubmittingAll || isScanning || queueCount === 0 ? "not-allowed" : "pointer",
            }}
          >
            {isSubmittingAll ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} />
            )}
            {isSubmittingAll ? "Submitting…" : `Submit all · ${queueCount}`}
          </button>
        </div>
      </div>

      {/* Column 2: Recovery gauge + mini-stats */}
      <div
        className="flex flex-col items-center justify-between p-6"
        style={{ borderRight: "1px solid oklch(1 0 0 / 0.06)" }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "oklch(0.62 0.018 65)",
            alignSelf: "flex-start",
          }}
        >
          Recovery rate
        </div>

        <AmberGauge value={recoveryRate} />

        {/* Mini stats */}
        <div className="w-full grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3"
            style={{ background: "oklch(0.245 0.016 55)" }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "oklch(0.62 0.018 65)",
                marginBottom: 4,
              }}
            >
              In flight
            </div>
            <div
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 22,
                fontWeight: 600,
                color: "oklch(0.97 0.01 80)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {inFlightCount}
            </div>
          </div>
          <div
            className="rounded-xl p-3"
            style={{
              background: deniedCount > 0
                ? "oklch(0.68 0.18 28 / 0.12)"
                : "oklch(0.245 0.016 55)",
              border: deniedCount > 0 ? "1px solid oklch(0.68 0.18 28 / 0.25)" : "none",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: deniedCount > 0 ? "oklch(0.78 0.15 35)" : "oklch(0.62 0.018 65)",
                marginBottom: 4,
              }}
            >
              Needs voice
            </div>
            <div
              style={{
                fontFamily: '"Newsreader", Georgia, serif',
                fontSize: 22,
                fontWeight: 600,
                color: deniedCount > 0 ? "oklch(0.78 0.15 35)" : "oklch(0.97 0.01 80)",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {deniedCount}
            </div>
          </div>
        </div>
      </div>

      {/* Column 3: Live ticker + platform pills */}
      <div className="flex flex-col gap-4 p-6">
        {/* Eyebrow with live pulse */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: "oklch(0.72 0.18 40)",
              boxShadow: "0 0 6px oklch(0.72 0.18 40 / 0.8)",
              animation: "pulse-dot 1.2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "oklch(0.62 0.018 65)",
            }}
          >
            dishpute is working
          </span>
        </div>

        {/* Newsreader italic quote */}
        <p
          style={{
            fontFamily: '"Newsreader", Georgia, serif',
            fontStyle: "italic",
            fontSize: 14,
            lineHeight: 1.5,
            color: "oklch(0.75 0.015 65)",
            letterSpacing: "-0.01em",
          }}
        >
          Every charge reviewed. Every merit case disputed. Every denial escalated.
        </p>

        {/* Animated ticker */}
        <div
          className="flex-1 overflow-hidden rounded-xl"
          style={{ background: "oklch(0.245 0.016 55)", minHeight: 100, maxHeight: 120 }}
        >
          <div className="animate-ticker">
            {TICKER_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2"
                style={{ borderBottom: "1px solid oklch(1 0 0 / 0.04)" }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "oklch(0.75 0.015 65)",
                    fontFamily: '"Geist", sans-serif',
                  }}
                >
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: item.amount.startsWith("+")
                        ? "oklch(0.86 0.15 75)"
                        : "oklch(0.75 0.015 65)",
                      fontFamily: '"JetBrains Mono", monospace',
                    }}
                  >
                    {item.amount}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "oklch(0.5 0.015 65)",
                    }}
                  >
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform breakdown pills */}
        <div className="flex flex-col gap-1.5">
          {PLATFORM_PILLS.map((p) => (
            <div key={p.label} className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: p.color }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: "oklch(0.75 0.015 65)",
                  flex: 1,
                }}
              >
                {p.label}
              </span>
              <div
                className="h-1 flex-1 rounded-full overflow-hidden"
                style={{ background: "oklch(1 0 0 / 0.06)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${p.pct}%`,
                    background: p.color,
                    opacity: 0.8,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 10,
                  color: "oklch(0.62 0.018 65)",
                  fontFamily: '"JetBrains Mono", monospace',
                  minWidth: 28,
                  textAlign: "right",
                }}
              >
                {p.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
