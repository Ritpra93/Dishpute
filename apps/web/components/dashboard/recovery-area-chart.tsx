"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

interface Point {
  day: string;
  recovered: number;
}

function buildSeries(): Point[] {
  const days = ["Apr 6","Apr 7","Apr 8","Apr 9","Apr 10","Apr 11","Apr 12","Apr 13","Apr 14","Apr 15","Apr 16","Apr 17","Apr 18","Apr 19"];
  let s = 11;
  return days.map((d, i) => {
    s = (s * 1664525 + 1013904223) >>> 0;
    const r = (s & 0xffff) / 0xffff;
    const base = 320 + Math.sin(i / 1.7) * 140 + r * 90;
    const recovered = Math.max(80, Math.round(base));
    return { day: d, recovered };
  });
}

export function RecoveryAreaChart() {
  const data = useMemo(buildSeries, []);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const peakIdx = useMemo(() => {
    let m = 0;
    data.forEach((p, i) => { if (p.recovered > data[m].recovered) m = i; });
    return m;
  }, [data]);
  const active = hoverIdx ?? peakIdx;
  const point = data[active];

  return (
    <div className="relative h-[120px] w-full">
      <div className="pointer-events-none absolute right-3 top-2 z-10 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-money" />
          Recovered
        </span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 24, right: 12, left: 0, bottom: 0 }}
          onMouseMove={(s) =>
            setHoverIdx(typeof s.activeTooltipIndex === "number" ? s.activeTooltipIndex : null)
          }
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="recoveredFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.9 0.23 130)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="oklch(0.9 0.23 130)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(1 0 0 / 0.05)" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fill: "oklch(0.68 0.012 250)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: "oklch(0.68 0.012 250)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `$${v}`}
          />
          {point && (
            <ReferenceLine
              x={point.day}
              stroke="oklch(0.88 0.22 130 / 0.5)"
              strokeDasharray="3 3"
            />
          )}
          <Tooltip
            cursor={false}
            content={({ active: a, payload, label }) => {
              if (!a || !payload?.length) return null;
              const rec = payload.find((p) => p.dataKey === "recovered")?.value as number | undefined;
              return (
                <div className="glass rounded-xl px-3 py-2 text-xs shadow-xl">
                  <div className="text-muted-foreground">{label}</div>
                  <div className="mt-1 flex items-center gap-2 tabular-nums">
                    <span className="h-1.5 w-1.5 rounded-full bg-money" />
                    Recovered{" "}
                    <span className="ml-auto font-medium text-money">{formatMoney(rec ?? 0)}</span>
                  </div>
                </div>
              );
            }}
          />

          <Area
            type="monotone"
            dataKey="recovered"
            stroke="oklch(0.9 0.23 130)"
            strokeWidth={2.5}
            fill="url(#recoveredFill)"
            dot={false}
            activeDot={{ r: 5, fill: "oklch(0.9 0.23 130)", stroke: "oklch(0.18 0.008 260)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
