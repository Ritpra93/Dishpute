"use client";

import { useState } from "react";
import { FieldLabel, OpsShell, PlatformPicker, type Platform } from "@/components/ops/ops-shell";
import { MENU_ITEMS } from "@/lib/fixtures/mock-portal-content";

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-money focus:outline-none focus:ring-1 focus:ring-money";

export default function OpsMenuPage() {
  const first = MENU_ITEMS[0];
  const [itemId, setItemId] = useState<string>(first?.id ?? "");
  const [priceCents, setPriceCents] = useState<number>(first?.priceCents ?? 1000);
  const [platforms, setPlatforms] = useState<Platform[]>(["doordash", "ubereats", "grubhub"]);

  const item = MENU_ITEMS.find((m) => m.id === itemId);

  return (
    <OpsShell
      endpoint="/api/ops/menu"
      description="Update an item's price across every connected portal at once. Counter handles the platform-specific UI flows for you."
      buildBody={() => ({
        itemId: item?.id ?? "",
        itemName: item?.name ?? "",
        newPriceCents: priceCents,
        platforms,
      })}
      submitLabel="Push price to all platforms"
      canSubmit={!!item && platforms.length > 0 && priceCents >= 50}
    >
      <FieldLabel label="Item">
        <select
          className={INPUT}
          value={itemId}
          onChange={(e) => {
            setItemId(e.target.value);
            const next = MENU_ITEMS.find((m) => m.id === e.target.value);
            if (next) setPriceCents(next.priceCents);
          }}
        >
          {MENU_ITEMS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · current ${(m.priceCents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </FieldLabel>

      <FieldLabel label="New price (USD)">
        <input
          type="number"
          step="0.01"
          min={0.5}
          max={500}
          className={INPUT}
          value={(priceCents / 100).toFixed(2)}
          onChange={(e) => {
            const dollars = Number(e.target.value);
            if (Number.isFinite(dollars)) {
              setPriceCents(Math.round(dollars * 100));
            }
          }}
        />
      </FieldLabel>

      <FieldLabel label="Platforms">
        <PlatformPicker selected={platforms} onChange={setPlatforms} />
      </FieldLabel>
    </OpsShell>
  );
}
