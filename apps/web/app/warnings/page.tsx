import { TopNav } from "@/components/top-nav";
import { WarningsFeed } from "@/components/warnings/warnings-feed";
import { FIXTURE_WARNINGS } from "@/lib/fixtures/warnings";

export const metadata = {
  title: "Counter — Early warnings",
};

export default function WarningsPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-3xl px-6 pb-16 pt-8">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-money">
          Early warnings · pre-dispute
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Catch the charge before it lands.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          Counter watches the auto-refund window, delivery telemetry, and
          customer-comment streams across DoorDash, Uber Eats, and Grubhub. When
          a charge is statistically likely, we stage the evidence early so the
          dispute is one click away the moment it deducts.
        </p>

        <div className="mt-8">
          <WarningsFeed initial={FIXTURE_WARNINGS} live variant="full" />
        </div>
      </main>
    </div>
  );
}
