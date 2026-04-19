import { DisputesTable } from "@/components/mock-portal/disputes-table";
import { DEMO_MERCHANT, FIXTURE_DISPUTES_UBEREATS } from "@/lib/types";

export default function UberEatsDisputesPage() {
  const total = FIXTURE_DISPUTES_UBEREATS.reduce(
    (s, d) => s + d.chargeAmountCents,
    0
  );

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-black/50">
            {DEMO_MERCHANT.name} · Past 14 days
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Order adjustments
          </h1>
          <p className="mt-1 text-sm text-black/60">
            Review charges and submit adjustments within 14 days.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-widest text-black/50">
            Open balance
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            ${(total / 100).toFixed(2)}
          </p>
          <p className="text-xs text-black/50">
            across {FIXTURE_DISPUTES_UBEREATS.length} adjustments
          </p>
        </div>
      </div>

      <DisputesTable
        disputes={FIXTURE_DISPUTES_UBEREATS}
        theme={{
          container: "overflow-hidden border border-black bg-white",
          headerRow: "border-b border-black bg-black text-left text-white",
          headerCell:
            "px-4 py-2 text-xs font-semibold uppercase tracking-widest",
          bodyRow:
            "border-b border-black/10 last:border-0 hover:bg-black/[0.03]",
          actionButton:
            "border border-black bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider hover:bg-black hover:text-white",
        }}
      />

      <p className="mt-4 text-xs text-black/50">
        Adjustments must be filed within 14 days of the charge date.
      </p>
    </div>
  );
}
