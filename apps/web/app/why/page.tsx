import Link from "next/link";
import { TopNav } from "@/components/top-nav";

export const metadata = {
  title: "Why Counter — API-proof recovery",
  description:
    "Counter recovers DoorDash, Uber Eats, and Grubhub error charges through the same web portals merchants use. No platform API required.",
};

const ROWS = [
  {
    capability: "Catches missing-item, cold-food, and never-delivered charges",
    counter: "yes",
    api: "no",
    note: "Most platforms expose payouts but not the dispute UI itself.",
  },
  {
    capability: "Files the dispute for you (not just a CSV export)",
    counter: "yes",
    api: "partial",
    note: "Where APIs exist they are read-only; Counter clicks the same button a merchant would.",
  },
  {
    capability: "Calls the support line when the platform denies the dispute",
    counter: "yes",
    api: "no",
    note: "Voice escalation is the second-stage recovery lever an API integration cannot replicate.",
  },
  {
    capability: "Survives a portal redesign without a code change",
    counter: "yes",
    api: "n/a",
    note: "Browser agents adapt; API integrations break the day the schema changes.",
  },
  {
    capability: "Works for merchants without a partner API contract",
    counter: "yes",
    api: "no",
    note: "Sub-$5M GMV restaurants are not eligible for most partner APIs at all.",
  },
  {
    capability: "Pays for itself out of recovered dollars",
    counter: "yes",
    api: "no",
    note: "Contingency-only billing — no recovery, no charge.",
  },
] as const;

function Marker({ kind }: { kind: "yes" | "no" | "partial" | "n/a" }) {
  const map = {
    yes: { label: "Yes", cls: "bg-money/15 text-money ring-money/30" },
    no: {
      label: "No",
      cls: "bg-denied-bg/30 text-denied-border ring-denied-border/30",
    },
    partial: {
      label: "Partial",
      cls: "bg-amber-500/15 text-amber-600 ring-amber-500/30",
    },
    "n/a": {
      label: "N/A",
      cls: "bg-muted text-muted-foreground ring-border",
    },
  } as const;
  const v = map[kind];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ${v.cls}`}
    >
      {v.label}
    </span>
  );
}

export default function WhyPage() {
  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-4xl px-6 pb-16 pt-10">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-money">
          Why Counter
        </div>
        <h1 className="text-4xl font-semibold tracking-tight">
          Recovery that works on every platform — even the ones without an API.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-foreground/70">
          DoorDash, Uber Eats, and Grubhub each leak error charges through their
          merchant portals. None of them ship a public dispute API. Counter
          drives the same browser the merchant would, files the dispute, and
          escalates to a phone call when the platform denies it.
        </p>

        <div className="glass mt-10 overflow-hidden rounded-2xl">
          <table className="w-full text-sm">
            <thead className="border-b border-border/40 bg-accent/30 text-left">
              <tr>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Capability
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-money">
                  Counter (browser agent)
                </th>
                <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform API
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.capability} className="border-b border-border/30 last:border-0">
                  <td className="px-5 py-4 align-top">
                    <div className="font-medium text-foreground">{row.capability}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{row.note}</div>
                  </td>
                  <td className="px-5 py-4 text-center align-top">
                    <Marker kind={row.counter} />
                  </td>
                  <td className="px-5 py-4 text-center align-top">
                    <Marker kind={row.api} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="glass mt-8 rounded-2xl border border-money/30 p-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-money">
            The point
          </div>
          <p className="mt-2 text-lg font-medium leading-snug text-foreground">
            APIs assume the platform wants you to recover your money. Counter
            assumes they don&apos;t.
          </p>
          <p className="mt-3 text-sm text-foreground/70">
            That&apos;s why we built Counter on top of TinyFish browser agents
            and an ElevenLabs voice agent — the same two surfaces a human
            merchant would use, automated end-to-end. When the portal changes,
            we adapt. When the dispute is denied, we call. When recovery hits
            the merchant&apos;s account, Stripe Connect tells us and we take
            our 10% — never a penny more.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-full bg-money px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              See it on a real merchant
            </Link>
            <Link
              href="/live"
              className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent/40"
            >
              Watch it run live
            </Link>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="glass rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Browser agent
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">TinyFish</div>
            <p className="mt-2 text-xs text-foreground/60">
              Headed Chromium, video replay, vault-managed session credentials.
            </p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Voice agent
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">ElevenLabs</div>
            <p className="mt-2 text-xs text-foreground/60">
              Outbound calls into platform support with full transcript audit.
            </p>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Settlement
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">Stripe Connect</div>
            <p className="mt-2 text-xs text-foreground/60">
              10% contingency taken at the moment of recovered transfer.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
