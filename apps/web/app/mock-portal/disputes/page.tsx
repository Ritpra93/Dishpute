/**
 * Mock DoorDash merchant portal — Disputes table.
 *
 * SCRAPING CONTRACT (frozen — Worker 1's TinyFish goal targets these selectors):
 *   - <table id="disputes-table">
 *   - Each <tr> carries:
 *       data-dispute-id="disp_NNNN"
 *       data-order-id="ord_NNNN"
 *       data-charge-cents="4780"
 *       data-charge-type="missing_item"
 *       data-items='[{"name":"...","quantity":N,"refundAmountCents":N}]'
 *       data-order-ts="ISO8601"
 *       data-charge-ts="ISO8601"
 *       data-portal-url="/mock-portal/disputes/disp_NNNN"
 *   - The customer comment cell has class="customer-comment"
 *   - Action cell has a <button>Dispute charge</button>
 *
 * If you change any of the above, coordinate with Worker 1 first or scraping
 * silently returns an empty array.
 */

import { FIXTURE_DISPUTES } from "@/lib/fixtures";
import { DEMO_MERCHANT } from "@/lib/types";

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
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MockDoorDashDisputesPage() {
  const totalCents = FIXTURE_DISPUTES.reduce((s, d) => s + d.chargeAmountCents, 0);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {DEMO_MERCHANT.name} · Last 14 days
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Open error charges
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Review charges and dispute within 14 days of the charge date.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Total open
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {fmtMoney(totalCents)}
          </p>
          <p className="text-xs text-neutral-500">
            across {FIXTURE_DISPUTES.length} charges
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-neutral-200 bg-white">
        <table id="disputes-table" className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Order
              </th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Charge type
              </th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Items
              </th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Customer note
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Amount
              </th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Charged
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE_DISPUTES.map((d) => {
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
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                >
                  <td className="px-4 py-3 font-mono text-xs text-neutral-700">
                    #{d.orderId.replace("ord_", "")}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {CHARGE_TYPE_LABEL[d.chargeType] ?? d.chargeType}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">{itemSummary}</td>
                  <td className="customer-comment max-w-xs px-4 py-3 text-neutral-600">
                    {d.customerComment ?? <span className="text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {fmtMoney(d.chargeAmountCents)}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {fmtDate(d.chargeTimestamp)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="rounded border border-neutral-300 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
                    >
                      Dispute charge
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-neutral-500">
        Disputes must be filed within 14 days of the charge date. Late disputes are auto-denied.
      </p>
    </div>
  );
}
