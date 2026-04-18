import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to dashboard
      </Link>
      <Suspense
        fallback={
          <div className="mt-8 text-sm text-muted-foreground">Loading…</div>
        }
      >
        <OnboardingClient />
      </Suspense>
    </div>
  );
}
