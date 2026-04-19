"use client";

import { useState } from "react";
import { FieldLabel, OpsShell, PlatformPicker, type Platform } from "@/components/ops/ops-shell";
import { MENU_ITEMS } from "@/lib/fixtures/mock-portal-content";

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-money focus:outline-none focus:ring-1 focus:ring-money";

export default function Op86Page() {
  const [itemId, setItemId] = useState<string>(MENU_ITEMS[0]?.id ?? "");
  const [duration, setDuration] = useState(4);
  const [platforms, setPlatforms] = useState<Platform[]>(["doordash", "ubereats", "grubhub"]);

  const item = MENU_ITEMS.find((m) => m.id === itemId) ?? MENU_ITEMS[0];

  return (
    <OpsShell
      endpoint="/api/ops/86"
      description="86 a menu item — Counter logs into each platform and toggles availability off, then back on after the duration expires."
      buildBody={() => ({
        itemId: item?.id ?? "",
        itemName: item?.name ?? "",
        durationHours: duration,
        platforms,
      })}
      submitLabel="86 across platforms"
      canSubmit={!!item && platforms.length > 0 && duration >= 1}
    >
      <FieldLabel label="Menu item">
        <select
          className={INPUT}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        >
          {MENU_ITEMS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · ${(m.priceCents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </FieldLabel>

      <FieldLabel label="Duration (hours)" hint="Counter will re-enable the item automatically.">
        <input
          type="number"
          min={1}
          max={72}
          className={INPUT}
          value={duration}
          onChange={(e) => setDuration(Math.max(1, Math.min(72, Number(e.target.value) || 1)))}
        />
      </FieldLabel>

      <FieldLabel label="Platforms">
        <PlatformPicker selected={platforms} onChange={setPlatforms} />
      </FieldLabel>
    </OpsShell>
  );
}
