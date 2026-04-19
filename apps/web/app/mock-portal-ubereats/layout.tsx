import Link from "next/link";
import { DEMO_MERCHANT } from "@/lib/types";

const NAV = [
  { href: "/mock-portal-ubereats/disputes", label: "Disputes", count: 4 },
  { href: "/mock-portal-ubereats/menu", label: "Menu" },
  { href: "/mock-portal-ubereats/hours", label: "Hours" },
  { href: "/mock-portal-ubereats/reviews", label: "Reviews" },
];

export default function MockUberEatsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b border-black bg-black text-white">
        <div className="flex h-12 items-center px-6">
          <Link
            href="/mock-portal-ubereats/disputes"
            className="text-base font-bold uppercase tracking-tight"
          >
            Uber Eats Manager
          </Link>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="opacity-90">
              {DEMO_MERCHANT.name} · {DEMO_MERCHANT.city}
            </span>
            <button
              type="button"
              className="rounded border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wider hover:bg-white/20"
            >
              Help
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-black/10 bg-white py-6 md:block">
          <nav className="flex flex-col gap-0.5 px-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded px-3 py-2 text-sm text-black/70 transition-colors hover:bg-black/5 hover:text-black"
              >
                <span>{item.label}</span>
                {typeof item.count === "number" && (
                  <span className="rounded-sm bg-black px-1.5 py-0.5 text-xs text-white">
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
