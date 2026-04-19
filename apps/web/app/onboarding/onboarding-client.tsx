"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CONTINGENCY_FEE_RATE, DEMO_MERCHANT } from "@/lib/types";

interface OnboardingResponse {
  mode: "live" | "mock" | "error";
  url?: string;
  accountId?: string;
  message?: string;
  error?: string;
}

const STEPS = [
  {
    key: "info",
    title: "Restaurant info",
    desc: "Tell us about your business.",
    done: true,
  },
  {
    key: "platforms",
    title: "Connect platforms",
    desc: "DoorDash, UberEats, Grubhub.",
    done: true,
  },
  {
    key: "payouts",
    title: "Connect payouts",
    desc: `Counter takes ${(CONTINGENCY_FEE_RATE * 100).toFixed(0)}% of recovered funds — only when we recover.`,
    done: false,
  },
] as const;

export function OnboardingClient() {
  const params = useSearchParams();
  const returned = params.get("return") === "1";
  const isMock = params.get("stripe") === "mock";
  const [step, setStep] = useState(returned ? STEPS.length : 2);
  const [email, setEmail] = useState(params.get("email") ?? `owner@${slug(DEMO_MERCHANT.name)}.com`);
  const [businessName, setBusinessName] = useState<string>(DEMO_MERCHANT.name);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<OnboardingResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch("/api/stripe/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, businessName }),
      });
      const data: OnboardingResponse = await r.json();
      setResult(data);
      if (data.mode === "live" && data.url) {
        window.location.href = data.url;
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-[280px_1fr]">
      {/* Step sidebar */}
      <aside className="space-y-2">
        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-foreground/60">
          Progress
        </div>
        {STEPS.map((s, i) => {
          const done = s.done || returned;
          const active = i === step && !returned;
          return (
            <button
              key={s.key}
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                active ? "border-money/30 bg-money-soft" : "bg-card",
                !active && !done && i > step && "opacity-60",
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  done
                    ? "bg-money text-money-foreground"
                    : active
                      ? "bg-money/20 text-money-soft-foreground"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </button>
          );
        })}
      </aside>

      {/* Main content */}
      <section className="glass rounded-2xl p-8">
        {returned ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-money">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-lg font-semibold">Stripe account connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You&apos;re all set. Counter will deposit recovered funds into this account within 2
              business days of platform approval.
            </p>
            <div className="mt-4 rounded-xl border bg-money-soft p-4 text-xs text-money-soft-foreground">
              Returned from {isMock ? "mock" : "live"} Stripe flow — onboarding complete.
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Connect payouts via Stripe</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Counter only gets paid when we recover money for you. To send those payouts back, we
                need a Stripe account.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="business-name">
                  Business name
                </label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor="email">
                  Owner email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Continue to Stripe
              </Button>
            </form>

            {result?.mode === "mock" && (
              <div className="rounded-xl border bg-money-soft p-4 text-xs text-money-soft-foreground">
                <p className="font-medium">Demo mode</p>
                <p className="mt-1">
                  {result.message}{" "}
                  <a className="underline hover:text-foreground" href={result.url}>
                    Continue with mocked onboarding
                  </a>
                  .
                </p>
              </div>
            )}
            {result?.mode === "error" && (
              <div className="rounded-xl border border-denied-border/30 bg-denied-bg p-4 text-xs">
                <p className="font-medium">Stripe error</p>
                <p className="mt-1 text-muted-foreground">{result.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex justify-between border-t pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || returned}
          >
            Back
          </Button>
          <Button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            disabled={step === STEPS.length - 1 || returned}
          >
            Continue
          </Button>
        </div>
      </section>
    </div>
  );
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
