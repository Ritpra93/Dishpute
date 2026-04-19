import { DisputesTable } from "@/components/mock-portal/disputes-table";
import { DEMO_MERCHANT, FIXTURE_DISPUTES_GRUBHUB } from "@/lib/types";

export default function GrubhubDisputesPage() {
  const total = FIXTURE_DISPUTES_GRUBHUB.reduce(
    (s, d) => s + d.chargeAmountCents,
    0
  );

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F63440]">
            {DEMO_MERCHANT.name} · Past 14 days
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Open adjustments
          </h1>
          <p className="mt-1 text-sm text-[#1A1A1A]/70">
            File adjustments within the 14-day window.
          </p>
        </div>
        <div className="rounded-2xl border border-[#F63440]/20 bg-white px-5 py-3 text-right shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F63440]">
            Open balance
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            ${(total / 100).toFixed(2)}
          </p>
          <p className="text-xs text-[#1A1A1A]/60">
            {FIXTURE_DISPUTES_GRUBHUB.length} open
          </p>
        </div>
      </div>

      <DisputesTable
        disputes={FIXTURE_DISPUTES_GRUBHUB}
        theme={{
          container: "overflow-hidden rounded-2xl border border-[#F63440]/20 bg-white shadow-sm",
          headerRow:
            "border-b border-[#F63440]/20 bg-[#FFF1E6] text-left text-[#F63440]",
          headerCell:
            "px-4 py-2.5 text-xs font-semibold uppercase tracking-wider",
          bodyRow:
            "border-b border-[#F63440]/10 last:border-0 hover:bg-[#FFF8F2]",
          actionButton:
            "rounded-full bg-[#F63440] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#D2202D]",
        }}
      />
    </div>
  );
}
