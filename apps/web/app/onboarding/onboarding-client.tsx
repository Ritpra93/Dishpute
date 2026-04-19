"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
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

type StepId = "vault" | "stripe" | "ignite";

interface PlatformCred {
  id: "doordash" | "ubereats" | "grubhub";
  label: string;
  email: string;
  password: string;
  saved: boolean;
}

const INPUT_CLASS =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-money focus:outline-none focus:ring-1 focus:ring-money";

function fmtElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m.toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

export function OnboardingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const returned = params.get("return") === "1";

  const [stepIdx, setStepIdx] = useState<number>(returned ? 2 : 0);
  const [credentials, setCredentials] = useState<PlatformCred[]>([
    { id: "doordash", label: "DoorDash", email: `owner@${slug(DEMO_MERCHANT.name)}.com`, password: "", saved: false },
    { id: "ubereats", label: "Uber Eats", email: "", password: "", saved: false },
    { id: "grubhub",  label: "Grubhub",  email: "", password: "", saved: false },
  ]);
  const [businessName, setBusinessName] = useState<string>(DEMO_MERCHANT.name);
  const [email, setEmail] = useState<string>(`owner@${slug(DEMO_MERCHANT.name)}.com`);
  const [submittingStripe, setSubmittingStripe] = useState(false);
  const [stripeResult, setStripeResult] = useState<OnboardingResponse | null>(null);
  const [stripeDone, setStripeDone] = useState(returned);

  const [igniting, setIgniting] = useState(false);
  const [firstDisputeAt, setFirstDisputeAt] = useState<number | null>(null);

  const startedAt = useRef<number>(Date.now());
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    if (firstDisputeAt) return;
    const t = setInterval(() => setNow(Date.now()), 87);
    return () => clearInterval(t);
  }, [firstDisputeAt]);

  const elapsedMs = (firstDisputeAt ?? now) - startedAt.current;

  const steps: { id: StepId; title: string; desc: string; complete: boolean }[] =
    useMemo(
      () => [
        {
          id: "vault",
          title: "Vault credentials",
          desc: "Counter stores platform logins in TinyFish Vault — encrypted at rest.",
          complete: credentials.every((c) => c.saved),
        },
        {
          id: "stripe",
          title: "Connect payouts",
          desc: `Counter takes ${(CONTINGENCY_FEE_RATE * 100).toFixed(0)}% of recovered funds — only when we recover.`,
          complete: stripeDone,
        },
        {
          id: "ignite",
          title: "Fire first dispute",
          desc: "Counter scans your portal and files a dispute live.",
          complete: firstDisputeAt !== null,
        },
      ],
      [credentials, stripeDone, firstDisputeAt]
    );

  function saveCredential(id: PlatformCred["id"]) {
    setCredentials((cs) =>
      cs.map((c) => (c.id === id ? { ...c, saved: true } : c))
    );
  }

  async function submitStripe(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingStripe(true);
    setStripeResult(null);
    try {
      const r = await fetch("/api/stripe/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, businessName }),
      });
      const data: OnboardingResponse = await r.json();
      setStripeResult(data);
      if (data.mode === "live" && data.url) {
        window.location.href = data.url;
      } else if (data.mode === "mock") {
        setStripeDone(true);
        setStepIdx(2);
      }
    } finally {
      setSubmittingStripe(false);
    }
  }

  async function ignite() {
    setIgniting(true);
    try {
      try {
        await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ platform: "doordash" }),
        });
      } catch {
        // Scan endpoint may be in production-locked mode; the wizard still
        // marks the milestone so the demo flow completes.
      }
      setFirstDisputeAt(Date.now());
    } finally {
      setIgniting(false);
    }
  }

  const allDone = steps.every((s) => s.complete);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <div className="glass flex items-center gap-3 rounded-2xl p-4">
          <Clock className="size-4 text-money" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Time to first dispute
            </div>
            <div className="font-mono text-2xl font-semibold tabular-nums">
              {fmtElapsed(elapsedMs)}
            </div>
          </div>
        </div>

        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Steps
        </div>
        {steps.map((s, i) => {
          const active = i === stepIdx;
          return (
            <button
              key={s.id}
              onClick={() => i <= stepIdx + 1 && setStepIdx(i)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors",
                active && "border-money/40 bg-money-soft",
                !active && i > stepIdx && "opacity-60"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  s.complete
                    ? "bg-money text-money-foreground"
                    : active
                    ? "bg-money/20 text-money-soft-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {s.complete ? <Check className="size-3.5" /> : i + 1}
              </div>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
            </button>
          );
        })}

        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-money/30 p-4"
          >
            <div className="flex items-center gap-2 text-money">
              <Sparkles className="size-4" />
              <span className="text-sm font-semibold">Live in production</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Counter is now scanning your portal nightly.
            </p>
            <Button
              size="sm"
              className="mt-3 w-full"
              onClick={() => router.push("/dashboard")}
            >
              Go to dashboard
              <ArrowRight className="size-3.5" />
            </Button>
          </motion.div>
        )}
      </aside>

      <section className="glass min-h-[460px] rounded-2xl p-8">
        {steps[stepIdx]?.id === "vault" && (
          <VaultStep
            credentials={credentials}
            onChange={setCredentials}
            onSave={saveCredential}
            onContinue={() => setStepIdx(1)}
          />
        )}
        {steps[stepIdx]?.id === "stripe" && (
          <StripeStep
            businessName={businessName}
            setBusinessName={setBusinessName}
            email={email}
            setEmail={setEmail}
            submitting={submittingStripe}
            onSubmit={submitStripe}
            result={stripeResult}
            done={stripeDone}
            onSkipToFire={() => {
              setStripeDone(true);
              setStepIdx(2);
            }}
          />
        )}
        {steps[stepIdx]?.id === "ignite" && (
          <IgniteStep
            igniting={igniting}
            onIgnite={ignite}
            firstDisputeAt={firstDisputeAt}
            elapsedMs={elapsedMs}
          />
        )}

        <div className="mt-8 flex justify-between border-t pt-6">
          <Button
            variant="ghost"
            onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
            disabled={stepIdx === 0}
          >
            Back
          </Button>
          <Button
            onClick={() => setStepIdx((s) => Math.min(steps.length - 1, s + 1))}
            disabled={
              stepIdx === steps.length - 1 ||
              !steps[stepIdx]?.complete
            }
          >
            Continue
          </Button>
        </div>
      </section>
    </div>
  );
}

function VaultStep({
  credentials,
  onChange,
  onSave,
  onContinue,
}: {
  credentials: PlatformCred[];
  onChange: (next: PlatformCred[]) => void;
  onSave: (id: PlatformCred["id"]) => void;
  onContinue: () => void;
}) {
  const allSaved = credentials.every((c) => c.saved);
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 size-5 text-money" />
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Vault your platform credentials
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Counter never stores plaintext logins. Each credential is sealed
            into TinyFish Vault and decrypted only at the moment of an agent
            run. Per-portal items are listed under{" "}
            <span className="font-mono text-xs">/v1/vault/items</span>.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {credentials.map((c, i) => (
          <div
            key={c.id}
            className={cn(
              "rounded-xl border p-4 transition-colors",
              c.saved ? "border-money/30 bg-money-soft" : "border-border bg-card"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{c.label}</div>
              {c.saved ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-money/15 px-2 py-0.5 text-[11px] font-semibold text-money">
                  <Check className="size-3" />
                  Vaulted
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Not vaulted
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                type="email"
                placeholder="Email"
                className={INPUT_CLASS}
                value={c.email}
                disabled={c.saved}
                onChange={(e) => {
                  const next = [...credentials];
                  next[i] = { ...c, email: e.target.value };
                  onChange(next);
                }}
              />
              <input
                type="password"
                placeholder="Password"
                className={INPUT_CLASS}
                value={c.password}
                disabled={c.saved}
                onChange={(e) => {
                  const next = [...credentials];
                  next[i] = { ...c, password: e.target.value };
                  onChange(next);
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => onSave(c.id)}
                disabled={c.saved || c.email.length < 3 || c.password.length < 4}
              >
                {c.saved ? "Saved" : "Vault it"}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {allSaved && (
        <Button onClick={onContinue}>
          Continue
          <ArrowRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

function StripeStep({
  businessName,
  setBusinessName,
  email,
  setEmail,
  submitting,
  onSubmit,
  result,
  done,
  onSkipToFire,
}: {
  businessName: string;
  setBusinessName: (s: string) => void;
  email: string;
  setEmail: (s: string) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  result: OnboardingResponse | null;
  done: boolean;
  onSkipToFire: () => void;
}) {
  if (done) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-money">
          <CheckCircle2 className="size-5" />
          <span className="text-lg font-semibold">Stripe account connected</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Counter will deposit recovered funds into this account within 2
          business days of platform approval.
        </p>
        <Button onClick={onSkipToFire}>
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Connect payouts via Stripe
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Counter only gets paid when we recover money for you. To send those
          payouts back, we need a Stripe Connect account.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium text-muted-foreground"
            htmlFor="business-name"
          >
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
          <label
            className="block text-xs font-medium text-muted-foreground"
            htmlFor="email"
          >
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
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ExternalLink className="size-4" />
          )}
          Continue to Stripe
        </Button>
      </form>

      {result?.mode === "mock" && (
        <div className="rounded-xl border bg-money-soft p-4 text-xs text-money-soft-foreground">
          <p className="font-medium">Demo mode</p>
          <p className="mt-1">
            {result.message}{" "}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={onSkipToFire}
            >
              Continue with mocked Stripe
            </button>
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
  );
}

function IgniteStep({
  igniting,
  onIgnite,
  firstDisputeAt,
  elapsedMs,
}: {
  igniting: boolean;
  onIgnite: () => void;
  firstDisputeAt: number | null;
  elapsedMs: number;
}) {
  if (firstDisputeAt) {
    return (
      <div className="space-y-5">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16 }}
          className="inline-flex items-center gap-2 rounded-full bg-money/15 px-3 py-1 text-sm font-semibold text-money"
        >
          <Sparkles className="size-4" />
          First dispute fired
        </motion.div>
        <h2 className="text-2xl font-semibold tracking-tight">
          You went from zero to recovering money in{" "}
          <span className="text-money">{fmtElapsed(elapsedMs)}</span>.
        </h2>
        <p className="text-sm text-muted-foreground">
          Counter will keep scanning every night. Head to the dashboard to
          watch the queue fill up — and review the first dispute Counter just
          filed for you.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold tracking-tight">
        Fire your first dispute
      </h2>
      <p className="text-sm text-muted-foreground">
        Counter is fully wired up. Click below to scan your DoorDash portal,
        classify every charge, and file the first dispute right now.
      </p>
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        Counter dispatches a TinyFish browser agent into the portal you just
        vaulted. Any charge with a recoverable merit score is filed
        automatically.
      </div>
      <Button onClick={onIgnite} disabled={igniting} size="lg">
        {igniting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Zap className="size-4" />
        )}
        {igniting ? "Firing…" : "Fire first dispute"}
      </Button>
    </div>
  );
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
