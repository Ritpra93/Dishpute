/**
 * Shared disputes table — same DOM contract Worker 1's TinyFish goal targets.
 *
 * Required attributes per row (frozen — see packages/types/src/platforms.ts
 * `DISPUTE_DOM_CONTRACT`):
 *   data-dispute-id, data-order-id, data-charge-cents, data-charge-type,
 *   data-items, data-order-ts, data-charge-ts, data-portal-url, data-merchant-id
 *   <td class="customer-comment"> + <button>Dispute charge</button>
 */

import { DEMO_MERCHANT, type DisputeCandidate } from "@/lib/types";

const CHARGE_TYPE_LABEL: Record<string, string> = {
  missing_item: "Missing item",
  wrong_item: "Wrong item",
  cold_food: "Cold food",
  order_never_arrived: "Not delivered",
  customer_cancel: "Customer cancel",
  unknown: "Other",
};

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ThemeProps {
  disputes: DisputeCandidate[];
  /** Tailwind class set for the theme — passed in by each portal. */
  theme: {
    container: string;
    headerRow: string;
    headerCell: string;
    bodyRow: string;
    actionButton: string;
  };
  emptyHint?: string;
}

export function DisputesTable({ disputes, theme, emptyHint }: ThemeProps) {
  return (
    <div className={theme.container}>
      <table id="disputes-table" className="w-full text-sm">
        <thead className={theme.headerRow}>
          <tr>
            <th className={theme.headerCell}>Order</th>
            <th className={theme.headerCell}>Charge type</th>
            <th className={theme.headerCell}>Items</th>
            <th className={theme.headerCell}>Customer note</th>
            <th className={theme.headerCell + " text-right"}>Amount</th>
            <th className={theme.headerCell}>Charged</th>
            <th className={theme.headerCell + " text-right"}>Action</th>
          </tr>
        </thead>
        <tbody>
          {disputes.map((d) => {
            const itemSummary = d.itemsReported
              .map((i) => `${i.quantity}× ${i.name}`)
              .join(", ");
            return (
              <tr
                key={d.id}
                data-dispute-id={d.id}
                data-order-id={d.orderId}
                data-charge-cents={d.chargeAmountCents}
                data-charge-type={d.chargeType}
                data-items={JSON.stringify(d.itemsReported)}
                data-order-ts={d.orderTimestamp}
                data-charge-ts={d.chargeTimestamp}
                data-portal-url={d.portalUrl}
                data-merchant-id={DEMO_MERCHANT.id}
                className={theme.bodyRow}
              >
                <td className="px-4 py-3 font-mono text-xs">
                  #{d.orderId.replace(/^ord_(?:ue_|gh_)?/, "")}
                </td>
                <td className="px-4 py-3">
                  {CHARGE_TYPE_LABEL[d.chargeType] ?? d.chargeType}
                </td>
                <td className="px-4 py-3">{itemSummary}</td>
                <td className="customer-comment max-w-xs px-4 py-3 text-black/60">
                  {d.customerComment ?? <span className="text-black/30">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {fmtMoney(d.chargeAmountCents)}
                </td>
                <td className="px-4 py-3 text-xs text-black/50">
                  {fmtDate(d.chargeTimestamp)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className={theme.actionButton}>
                    Dispute charge
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {disputes.length === 0 && emptyHint && (
        <p className="px-4 py-8 text-center text-sm text-black/50">{emptyHint}</p>
      )}
    </div>
  );
}
