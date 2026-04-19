import { TopNav } from "@/components/top-nav";
import { OpsTabs } from "@/components/ops/ops-tabs";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <div className="mb-2 text-xs font-medium uppercase tracking-widest text-money">
          Operator console
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Push the same change to every platform.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-foreground/70">
          One form → Counter logs into DoorDash, Uber Eats, and Grubhub and
          makes the change. No CSV uploads, no API integrations.
        </p>

        <OpsTabs />

        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
