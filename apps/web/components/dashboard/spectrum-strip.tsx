"use client";

import { formatMoney } from "@/lib/format";

interface Segment {
  label: string;
  amount: number;
}

const SEGMENTS: Segment[] = [
  { label: "Missing items", amount: 312.4 },
  { label: "Wrong items", amount: 248.9 },
  { label: "Courier no-show", amount: 186.0 },
  { label: "Duplicate charges", amount: 112.5 },
  { label: "Cancelled / paid", amount: 34.0 },
];

export function SpectrumStrip() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {SEGMENTS.map((s) => (
          <div key={s.label} className="min-w-0">
            <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">
              {s.label}
            </div>
            <div className="mt-1 truncate font-display text-xl font-semibold tabular-nums text-foreground">
              {formatMoney(s.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
