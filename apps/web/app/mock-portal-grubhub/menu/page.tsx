import { MENU_ITEMS } from "@/lib/fixtures/mock-portal-content";

export default function GrubhubMenuPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Menu</h1>
      <p className="mb-6 text-sm text-[#1A1A1A]/70">
        {MENU_ITEMS.length} items live on Grubhub
      </p>
      <div className="overflow-hidden rounded-2xl border border-[#F63440]/20 bg-white shadow-sm">
        <table id="menu-table" className="w-full text-sm">
          <thead className="border-b border-[#F63440]/20 bg-[#FFF1E6] text-left text-[#F63440]">
            <tr>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Item</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Category</th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider">Price</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {MENU_ITEMS.map((m) => (
              <tr
                key={m.id}
                data-menu-item-id={m.id}
                data-price-cents={m.priceCents}
                data-available={m.available ? "1" : "0"}
                className="border-b border-[#F63440]/10 last:border-0 hover:bg-[#FFF8F2]"
              >
                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                <td className="px-4 py-2.5 text-[#1A1A1A]/60">{m.category}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  ${(m.priceCents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-2.5">
                  {m.available ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#F63440]/10 px-2 py-0.5 text-xs font-semibold text-[#F63440]">
                      Sold out
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
