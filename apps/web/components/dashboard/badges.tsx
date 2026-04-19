import { cn } from "@/lib/utils";
import type { Platform } from "@/lib/types";

const PLATFORM_LABEL: Record<Platform, string> = {
  doordash: "DoorDash",
  ubereats: "UberEats",
  grubhub: "Grubhub",
};

const PLATFORM_DOT: Record<Platform, string> = {
  doordash: "bg-[oklch(0.65_0.2_25)]",
  ubereats: "bg-[oklch(0.7_0.18_150)]",
  grubhub: "bg-[oklch(0.7_0.18_25)]",
};

export function PlatformPill({ platform }: { platform: Platform }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={cn("h-1.5 w-1.5 rounded-full", PLATFORM_DOT[platform])} />
      {PLATFORM_LABEL[platform]}
    </span>
  );
}

const CHARGE_LABEL: Record<string, string> = {
  missing_item: "Missing item",
  wrong_item: "Wrong item",
  cold_food: "Cold food",
  order_never_arrived: "Not delivered",
  customer_cancel: "Customer cancel",
  late_delivery: "Late delivery",
  courier_no_show: "Courier no-show",
  duplicate_charge: "Duplicate charge",
  cancelled_paid: "Cancelled but paid",
  unknown: "Other",
};

export function ChargeTypeLabel({ type }: { type: string }) {
  return <span className="text-sm">{CHARGE_LABEL[type] ?? type.replace(/_/g, " ")}</span>;
}
