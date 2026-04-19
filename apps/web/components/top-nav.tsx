"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Disputes" },
  { href: "/warnings", label: "Warnings" },
  { href: "/live", label: "Live" },
  { href: "/ops", label: "Ops" },
  { href: "/calls", label: "Calls" },
  { href: "/pnl", label: "P&L" },
  { href: "/trust", label: "Trust" },
  { href: "/onboarding", label: "Onboarding" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-4 z-30 mx-auto mt-4 w-[min(1200px,calc(100%-2rem))] px-0">
      <header className="glass flex h-14 items-center justify-between rounded-2xl px-4">
        <Link href="/dashboard" className="flex items-center gap-2 pl-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-semibold">¢</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">Counter</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((n) => {
            const active =
              n.href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/"
                : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-accent text-accent-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">House of Curry</span>
          <div className="h-7 w-7 rounded-full bg-primary/30 text-center text-xs leading-7 text-foreground ring-1 ring-primary/40">
            HC
          </div>
        </div>
      </header>
    </div>
  );
}
