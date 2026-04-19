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
          Early warnings
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Stop charges before they happen.
        </h1>
        <p className="mt-2 max-w-xl text-sm text-foreground/60">
          dishpute monitors your deliveries in real time. When a charge looks likely, evidence is already staged.
        </p>

        <div className="mt-8">
          <WarningsFeed initial={FIXTURE_WARNINGS} live variant="full" />
        </div>
      </main>
    </div>
  );
}
