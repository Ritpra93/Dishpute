import { HOURS_GRID } from "@/lib/fixtures/mock-portal-content";

export default function UberEatsHoursPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Hours</h1>
      <p className="mb-6 text-sm text-black/60">
        Stoplight changes go live across Uber Eats within 5 minutes.
      </p>
      <div className="overflow-hidden border border-black bg-white">
        <table id="hours-table" className="w-full text-sm">
          <thead className="border-b border-black bg-black text-left text-white">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest">Day</th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest">Opens</th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest">Closes</th>
            </tr>
          </thead>
          <tbody>
            {HOURS_GRID.map((row) => (
              <tr
                key={row.day}
                data-day={row.day}
                data-open={row.open}
                data-close={row.close}
                className="border-b border-black/10 last:border-0"
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
