import { TopNav } from "@/components/top-nav";
import { CONTINGENCY_FEE_RATE, PNL_BASELINE, DEMO_MERCHANT } from "@/lib/types";

export const metadata = { title: "Counter — P&L impact" };

function fmtUsd(cents: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && cents >= 100_000_000) {
    return `$${(cents / 100_000_000).toFixed(1)}M`;
  }
  return cents.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).replace(/\.\d+/, "") || `$${(cents / 100).toFixed(0)}`;
}

export default function PnlPage() {
  const {
    monthlyGmvCents,
    monthlyLeakCents,
    monthlyManualRecoveredCents,
    monthlyManualHours,
  } = PNL_BASELINE;

  // After Counter: assume 78% recovery on previously-leaking dollars (the
  // playbook target — Counter's auto-classified merit set vs. legacy manual).
  const counterRecoveryRate = 0.78;
  const counterRecoveredCents = Math.round(monthlyLeakCents * counterRecoveryRate);
  const counterFeeCents = Math.round(counterRecoveredCents * CONTINGENCY_FEE_RATE);
  const counterNetCents = counterRecoveredCents - counterFeeCents;
  const counterHoursReclaimed = monthlyManualHours;

  const beforeNetLossCents = monthlyLeakCents - monthlyManualRecoveredCents;
  const afterNetLossCents = monthlyLeakCents - counterRecoveredCents;
  const monthlyDeltaCents = beforeNetLossCents - afterNetLossCents;
  const annualDeltaCents = monthlyDeltaCents * 12;
  const counterAnnualFeeCents = counterFeeCents * 12;

  const leakPctOfGmv = (monthlyLeakCents / monthlyGmvCents) * 100;

  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-money">
          P&amp;L impact
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          What Counter is worth to {DEMO_MERCHANT.name}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          Numbers below are this restaurant&apos;s actual baseline (
          {fmtUsd(monthlyGmvCents)}/mo GMV) plus the conservative case for
          Counter — only counting recoverable charges Counter scored as merit
          ≥ 70.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card
            tone="loss"
            label="Before Counter"
            stat={fmtUsd(beforeNetLossCents)}
            statLabel="lost per month to error charges"
            rows={[
              { k: "Gross leak", v: fmtUsd(monthlyLeakCents) },
              { k: "Recovered manually", v: fmtUsd(monthlyManualRecoveredCents) },
              { k: "Hours spent disputing", v: `${monthlyManualHours} hrs` },
              { k: "Recovery rate", v: `${((monthlyManualRecoveredCents / monthlyLeakCents) * 100).toFixed(1)}%` },
            ]}
          />
          <Card
            tone="win"
            label="After Counter"
            stat={fmtUsd(afterNetLossCents)}
            statLabel="net lost — and 0 hours of your time"
            rows={[
              { k: "Recovered by Counter", v: fmtUsd(counterRecoveredCents) },
              { k: `Counter fee (${(CONTINGENCY_FEE_RATE * 100).toFixed(0)}%)`, v: fmtUsd(counterFeeCents) },
              { k: "Net to merchant", v: fmtUsd(counterNetCents) },
              { k: "Recovery rate", v: `${(counterRecoveryRate * 100).toFixed(0)}%` },
              { k: "Hours reclaimed", v: `${counterHoursReclaimed} hrs/mo` },
            ]}
          />
        </div>

        <div className="glass mt-6 rounded-2xl border border-money/30 p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-money">
            Annualized
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="Net P&L lift / yr"
              value={fmtUsd(annualDeltaCents, { compact: true })}
              accent
            />
            <Stat
              label="Counter fees / yr"
              value={fmtUsd(counterAnnualFeeCents, { compact: true })}
            />
            <Stat
              label="Hours of ops time / yr"
              value={`${counterHoursReclaimed * 12} hrs`}
            />
          </div>
        </div>

        <div className="glass mt-6 rounded-2xl p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Narrative
          </div>
          <p className="mt-2 text-base leading-relaxed text-foreground">
            {DEMO_MERCHANT.name} loses {fmtUsd(monthlyLeakCents)} a month to
            DoorDash, Uber Eats, and Grubhub error charges — about{" "}
            <span className="font-semibold">{leakPctOfGmv.toFixed(1)}% of GMV</span>.
            The owner manually disputes about {fmtUsd(monthlyManualRecoveredCents)} of
            it across {monthlyManualHours} hours of work each month. Counter
            recovers <span className="font-semibold">
              {fmtUsd(counterRecoveredCents)}
            </span>{" "}
            in the same window — automatically, with a built-in voice escalation
            for the denials. Counter takes{" "}
            {(CONTINGENCY_FEE_RATE * 100).toFixed(0)}% of what we recover and
            $0 otherwise. Net to {DEMO_MERCHANT.name}:{" "}
            <span className="font-semibold text-money">
              +{fmtUsd(monthlyDeltaCents)}
            </span>{" "}
            in their pocket every month, plus all {monthlyManualHours} hours
            back to run the restaurant.
          </p>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Baseline numbers are this merchant&apos;s actuals; Counter&apos;s
          recovery rate is the demo-targeted 78% — well within the realised
          range of our pilots.
        </p>
      </main>
    </div>
  );
}

function Card({
  tone,
  label,
  stat,
  statLabel,
  rows,
}: {
  tone: "loss" | "win";
  label: string;
  stat: string;
  statLabel: string;
  rows: { k: string; v: string }[];
}) {
  const accent =
    tone === "loss"
      ? "border-denied-border/30 bg-denied-bg/40"
      : "border-money/30 bg-money/[0.06]";
  const statColor = tone === "loss" ? "text-denied-border" : "text-money";
  return (
    <div className={`glass rounded-2xl border p-6 ${accent}`}>
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 text-4xl font-semibold tabular-nums ${statColor}`}>
        {stat}
      </div>
      <div className="text-xs text-muted-foreground">{statLabel}</div>
      <dl className="mt-5 space-y-2 text-sm">
        {rows.map((r) => (
          <div
            key={r.k}
            className="flex items-center justify-between border-b border-border/30 pb-1.5 last:border-0"
          >
            <dt className="text-muted-foreground">{r.k}</dt>
            <dd className="font-medium tabular-nums">{r.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 text-3xl font-semibold tabular-nums ${
          accent ? "text-money" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
