import { Suspense } from "react";
import { TopNav } from "@/components/top-nav";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen">
      <TopNav />
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6">
          <div className="text-xs font-medium uppercase tracking-wider text-foreground/60">Setup</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Connect your restaurant
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Counter scans your delivery platforms nightly and disputes every recoverable charge.
          </p>
        </div>
        <Suspense fallback={<div className="mt-8 text-sm text-muted-foreground">Loading…</div>}>
          <OnboardingClient />
        </Suspense>
      </main>
    </div>
  );
}
