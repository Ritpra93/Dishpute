import { HOURS_GRID } from "@/lib/fixtures/mock-portal-content";

export default function GrubhubHoursPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hours</h1>
      <p className="mb-6 text-sm text-[#1A1A1A]/70">
        Hours sync to your customer-facing Grubhub listing within 5 minutes.
      </p>
      <div className="overflow-hidden rounded-2xl border border-[#F63440]/20 bg-white shadow-sm">
        <table id="hours-table" className="w-full text-sm">
          <thead className="border-b border-[#F63440]/20 bg-[#FFF1E6] text-left text-[#F63440]">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Day</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Opens</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Closes</th>
            </tr>
          </thead>
          <tbody>
            {HOURS_GRID.map((row) => (
              <tr
                key={row.day}
                data-day={row.day}
                data-open={row.open}
                data-close={row.close}
                className="border-b border-[#F63440]/10 last:border-0"
              >
                <td className="px-4 py-2.5 font-medium">{row.day}</td>
                <td className="px-4 py-2.5 tabular-nums">{row.open}</td>
                <td className="px-4 py-2.5 tabular-nums">{row.close}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
