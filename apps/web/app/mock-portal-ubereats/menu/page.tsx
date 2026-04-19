import { MENU_ITEMS } from "@/lib/fixtures/mock-portal-content";

export default function UberEatsMenuPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Menu</h1>
      <p className="mb-6 text-sm text-black/60">
        {MENU_ITEMS.length} items · last sync 4m ago
      </p>
      <div className="overflow-hidden border border-black bg-white">
        <table id="menu-table" className="w-full text-sm">
          <thead className="border-b border-black bg-black text-left text-white">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest">Item</th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest">Category</th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-widest">Price</th>
              <th className="px-4 py-2 text-xs font-semibold uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody>
            {MENU_ITEMS.map((m) => (
              <tr
                key={m.id}
                data-menu-item-id={m.id}
                data-price-cents={m.priceCents}
                data-available={m.available ? "1" : "0"}
                className="border-b border-black/10 last:border-0 hover:bg-black/[0.03]"
              >
                <td className="px-4 py-2.5 font-medium">{m.name}</td>
                <td className="px-4 py-2.5 text-black/60">{m.category}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  ${(m.priceCents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-2.5">
                  {m.available ? (
                    <span className="rounded-sm bg-black px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white">
                      Available
                    </span>
                  ) : (
                    <span className="rounded-sm border border-black px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                      86&apos;d
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
