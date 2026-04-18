import Link from "next/link";
import { DEMO_MERCHANT } from "@/lib/types";

const NAV = [
  { href: "/mock-portal/orders", label: "Orders", count: 247 },
  { href: "/mock-portal/disputes", label: "Disputes", count: 30, active: true },
  { href: "/mock-portal/analytics", label: "Analytics" },
  { href: "/mock-portal/menu", label: "Menu" },
  { href: "/mock-portal/payouts", label: "Payouts" },
  { href: "/mock-portal/settings", label: "Settings" },
];

export default function MockPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#1F1F1F]">
      <header className="bg-[#EB1700] text-white">
        <div className="flex h-12 items-center px-6">
          <Link href="/mock-portal/orders" className="text-base font-bold tracking-tight">
            DOORDASH MERCHANT
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="opacity-90">
              {DEMO_MERCHANT.name} — {DEMO_MERCHANT.city} ({DEMO_MERCHANT.locations} locations)
            </span>
            <button
              type="button"
              className="rounded bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide hover:bg-white/25"
            >
              Help
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-neutral-200 bg-white py-6 md:block">
          <nav className="flex flex-col gap-0.5 px-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors " +
                  (item.active
                    ? "bg-neutral-100 text-[#1F1F1F]"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-[#1F1F1F]")
                }
              >
                <span>{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-700">
                    {item.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
