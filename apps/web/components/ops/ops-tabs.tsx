"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/ops/86", label: "86 an item" },
  { href: "/ops/hours", label: "Hours" },
  { href: "/ops/menu", label: "Menu" },
  { href: "/ops/reviews", label: "Reviews" },
] as const;

export function OpsTabs() {
  const pathname = usePathname();
  return (
    <nav className="glass mt-6 inline-flex gap-1 rounded-full p-1">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "bg-money text-primary-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
