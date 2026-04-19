"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function CounterMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-label="dishpute">
      <defs>
        <radialGradient id="plateGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="oklch(0.97 0.015 75)" />
          <stop offset="100%" stopColor="oklch(0.88 0.03 68)" />
        </radialGradient>
        <radialGradient id="coinA" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="oklch(0.92 0.17 80)" />
          <stop offset="100%" stopColor="oklch(0.72 0.17 68)" />
        </radialGradient>
        <radialGradient id="coinB" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="oklch(0.95 0.16 82)" />
          <stop offset="100%" stopColor="oklch(0.76 0.18 70)" />
        </radialGradient>
        <radialGradient id="coinTop" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="oklch(0.98 0.15 84)" />
          <stop offset="100%" stopColor="oklch(0.80 0.18 74)" />
        </radialGradient>
        <filter id="plateShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodOpacity="0.18" />
        </filter>
      </defs>

      {/* Plate */}
      <circle cx="20" cy="22" r="17" fill="url(#plateGrad)" filter="url(#plateShadow)" />
      <circle cx="20" cy="22" r="17" stroke="oklch(0.76 0.06 62)" strokeWidth="1" />
      {/* Plate rim ring */}
      <circle cx="20" cy="22" r="13.5" fill="none" stroke="oklch(0.80 0.05 64)" strokeWidth="0.75" />

      {/* 3 coins — two at bottom, one on top */}
      {/* Bottom-left coin */}
      <circle cx="15.5" cy="24" r="6" fill="url(#coinA)" stroke="oklch(0.64 0.15 66)" strokeWidth="0.6" />
      {/* Bottom-right coin */}
      <circle cx="24.5" cy="24" r="6" fill="url(#coinB)" stroke="oklch(0.64 0.15 66)" strokeWidth="0.6" />
      {/* Top coin (front) */}
      <circle cx="20" cy="18.5" r="6.5" fill="url(#coinTop)" stroke="oklch(0.68 0.16 68)" strokeWidth="0.75" />

      {/* $ on the top coin */}
      <text
        x="20" y="21.5"
        textAnchor="middle"
        fill="oklch(0.42 0.13 58)"
        fontSize="8"
        fontWeight="700"
        fontFamily="Georgia, 'Times New Roman', serif"
      >$</text>
    </svg>
  );
}

const NAV = [
  { href: "/dashboard", label: "Disputes" },
  { href: "/warnings", label: "Warnings" },
  { href: "/live", label: "Live" },
{ href: "/calls", label: "Calls" },
  { href: "/trust", label: "Trust" },
  { href: "/onboarding", label: "Onboarding" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <div
      className="sticky top-0 z-30 w-full border-b border-border"
      style={{
        background: "oklch(0.17 0.012 50 / 0.75)",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
      }}
    >
      <header className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-7">
        <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
          <CounterMark size={30} />
          <span
            style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: "-0.015em",
              lineHeight: 1,
              color: "var(--color-foreground)",
            }}
          >
            dishpute
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
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
                  "relative px-3.5 py-2 text-[13px] transition-colors",
                  active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {n.label}
                {active && (
                  <span
                    className="absolute bottom-0 left-3.5 right-3.5 h-[2px] rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, oklch(0.72 0.15 45) 0%, oklch(0.82 0.16 75) 100%)",
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span
            style={{
              fontFamily: '"Newsreader", Georgia, serif',
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--color-card-foreground)",
              opacity: 0.7,
            }}
          >
            House of Curry
          </span>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{
              background:
                "linear-gradient(135deg, oklch(0.72 0.15 45), oklch(0.58 0.13 38))",
              color: "oklch(0.18 0.02 45)",
              boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.15)",
              fontFamily: '"Newsreader", Georgia, serif',
              letterSpacing: "-0.02em",
            }}
          >
            HC
          </div>
        </div>
      </header>
    </div>
  );
}
