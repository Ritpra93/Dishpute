"use client";

import { useState } from "react";
import { FieldLabel, OpsShell, PlatformPicker, type Platform } from "@/components/ops/ops-shell";

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-money focus:outline-none focus:ring-1 focus:ring-money";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export default function OpsHoursPage() {
  const [day, setDay] = useState<(typeof DAYS)[number]>("Friday");
  const [open, setOpen] = useState("11:00");
  const [close, setClose] = useState("23:00");
  const [platforms, setPlatforms] = useState<Platform[]>(["doordash", "ubereats", "grubhub"]);

  return (
    <OpsShell
      endpoint="/api/ops/hours"
      description="Update operating hours across every platform — kitchen running late or closing early? One change, three portals."
      buildBody={() => ({ day, open, close, platforms })}
      canSubmit={platforms.length > 0}
    >
      <FieldLabel label="Day">
        <select
          className={INPUT}
          value={day}
          onChange={(e) => setDay(e.target.value as (typeof DAYS)[number])}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </FieldLabel>

      <div className="grid grid-cols-2 gap-4">
        <FieldLabel label="Open">
          <input
            type="time"
            className={INPUT}
            value={open}
            onChange={(e) => setOpen(e.target.value)}
          />
        </FieldLabel>
        <FieldLabel label="Close">
          <input
            type="time"
            className={INPUT}
            value={close}
            onChange={(e) => setClose(e.target.value)}
          />
        </FieldLabel>
      </div>

      <FieldLabel label="Platforms">
        <PlatformPicker selected={platforms} onChange={setPlatforms} />
      </FieldLabel>
    </OpsShell>
  );
}
