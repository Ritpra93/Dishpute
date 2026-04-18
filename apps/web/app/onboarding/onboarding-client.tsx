"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    label: "Connect DoorDash account",
    detail: "We use TinyFish to log in on your behalf and watch for new charges.",
    done: true,
  },
  {
    label: "Set Counter dispute thresholds",
    detail: "Auto-submit at merit ≥ 70 by default. Adjust later in Settings.",
    done: true,
  },
  {
    label: "Connect payouts via Stripe",
    detail: `Counter takes ${(CONTINGENCY_FEE_RATE * 100).toFixed(0)}% of recovered funds — only when we recover.`,
    done: false,
    active: true,
  },
];

export function OnboardingClient() {
  const params = useSearchParams();
  const returned = params.get("return") === "1";
  const isMock = params.get("stripe") === "mock";
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
    <div className="mt-6 space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {DEMO_MERCHANT.name}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Connect your payouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Counter only gets paid when we recover money for you. To send those payouts back,
          we need a Stripe account.
        </p>
      </header>

      {returned && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-money">
              <CheckCircle2 className="size-4" /> Stripe account connected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You&apos;re all set. Counter will deposit recovered funds into this account
              within 2 business days of platform approval.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Onboarding progress</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <div
                  className={
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold " +
                    (s.done
                      ? "bg-money text-money-foreground"
                      : s.active
                        ? "border-2 border-foreground text-foreground"
                        : "border border-border text-muted-foreground")
                  }
                >
                  {s.done ? <CheckCircle2 className="size-3" /> : i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </div>
                {s.done && <Badge variant="money">Done</Badge>}
                {s.active && <Badge variant="outline">In progress</Badge>}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stripe Connect</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="business-name"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Business name
              </label>
              <Input
                id="business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                Owner email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                required
              />
            </div>
            <Button type="submit" variant="money" disabled={submitting}>
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ExternalLink className="size-4" />
              )}
              Continue to Stripe
            </Button>
          </form>

          {result?.mode === "mock" && (
            <div className="mt-4 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Demo mode</p>
              <p className="mt-1">
                {result.message}{" "}
                <a
                  className="underline hover:text-foreground"
                  href={result.url}
                >
                  Continue with mocked onboarding
                </a>
                .
              </p>
            </div>
          )}
          {result?.mode === "error" && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <p className="font-medium text-destructive">Stripe error</p>
              <p className="mt-1 text-muted-foreground">{result.error}</p>
            </div>
          )}
          {isMock && !result && (
            <div className="mt-4 rounded-md border bg-money-soft p-3 text-xs text-money-soft-foreground">
              Returned from mock Stripe flow — in production this would complete the
              onboarding.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
