import Link from "next/link";
import { DEMO_MERCHANT } from "@/lib/types";

const NAV = [
  { href: "/mock-portal-grubhub/disputes", label: "Adjustments", count: 3 },
  { href: "/mock-portal-grubhub/menu", label: "Menu" },
  { href: "/mock-portal-grubhub/hours", label: "Hours" },
  { href: "/mock-portal-grubhub/reviews", label: "Reviews" },
];

export default function MockGrubhubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFF8F2] text-[#1A1A1A]">
      <header className="bg-[#F63440] text-white">
        <div className="flex h-12 items-center px-6">
          <Link
            href="/mock-portal-grubhub/disputes"
            className="text-base font-bold tracking-tight"
          >
            Grubhub for Restaurants
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="opacity-95">
              {DEMO_MERCHANT.name} · {DEMO_MERCHANT.city}
            </span>
            <button
              type="button"
              className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
            >
              Help
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-[#F63440]/20 bg-white py-6 md:block">
          <nav className="flex flex-col gap-0.5 px-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-full px-4 py-2 text-sm font-medium text-[#1A1A1A]/70 transition-colors hover:bg-[#FFF1E6] hover:text-[#F63440]"
              >
                <span>{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="rounded-full bg-[#F63440]/10 px-2 py-0.5 text-xs text-[#F63440]">
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
