import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TRUST_FIXTURE, type TrustCenterPayload } from "@/lib/trust-fixture";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(iso: string): string {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

async function loadTrust(): Promise<TrustCenterPayload> {
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const res = await fetch(`${proto}://${host}/api/trust`, { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()) as TrustCenterPayload;
  } catch {
    return TRUST_FIXTURE;
  }
}

export default async function TrustPage() {
  const t = await loadTrust();
  const passingPct = Math.round((t.summary.controlsPassing / t.summary.controlsTotal) * 100);
  const connected = t.integrations.filter((i) => i.connectionStatus === "CONNECTED").length;
  const configured = t.integrations.filter((i) => i.connectionStatus === "CONFIGURED").length;
  const soc2 = t.frameworks.find((f) => f.productFamily === "soc2");

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to dashboard
      </Link>

      <header className="mt-4 mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.organization} Inc.
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trust center</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Counter handles your delivery-platform credentials and dispute records. We earn and
            prove trust continuously, monitored by {t.monitoredBy} against industry compliance
            frameworks. Every autonomous action our dispute agent takes runs through a Vanta
            pre-flight check.
          </p>
        </div>
        <Badge variant="money" className="gap-1.5 px-3 py-1.5">
          <ShieldCheck className="size-3.5" /> Monitored by {t.monitoredBy}
        </Badge>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {soc2 && (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{soc2.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">{soc2.completionPercent}%</p>
              <Progress value={soc2.completionPercent} className="mt-2" />
              <p className="mt-2 text-xs text-muted-foreground">
                {soc2.nextAuditDate
                  ? `Next audit · ${fmtDate(soc2.nextAuditDate)}`
                  : `${soc2.controlsCompletedCount} / ${soc2.controlsCount} controls complete`}
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Controls passing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {t.summary.controlsPassing}
              <span className="text-base font-normal text-muted-foreground">
                {" "}
                / {t.summary.controlsTotal}
              </span>
            </p>
            <Progress value={passingPct} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t.summary.controlsFailing} controls under remediation · {t.summary.testsPassing}/
              {t.summary.testsTotal} automated tests passing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{t.integrations.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {connected} connected · {configured} configured
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Frameworks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {t.frameworks.map((f) => (
              <div key={f.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{f.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {f.completionPercent}%
                  </span>
                </div>
                <Progress value={f.completionPercent} className="mt-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connected services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {t.integrations.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {i.connectionStatus === "CONNECTED" ? (
                    <CheckCircle2 className="size-3.5 text-money" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-500" />
                  )}
                  <span className="flex-1">{i.displayName}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {i.connectionStatus.toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4" />
                <CardTitle>AI governance</CardTitle>
              </div>
              <Link
                href="/trust/aims"
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
              >
                Read the AI Impact Assessment
                <ArrowLeft className="size-3 rotate-180" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Counter&apos;s dispute agent operates under an ISO 42001 AI Management System.
              Every autonomous decision — classification, evidence assembly, voice escalation — is
              logged, gated by a human-in-the-loop approval, and reversible.
            </p>
            <p>
              Compliance posture is treated as a force multiplier: if a SOC 2 control regresses,
              the agent stops acting on your behalf until the gate clears.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent compliance events</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {t.recentEvents.map((e, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 border-l-2 border-border pl-4"
                >
                  {e.severity === "warn" ? (
                    <AlertTriangle className="mt-0.5 size-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-4 text-money" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm">{e.label}</p>
                    <p className="text-xs text-muted-foreground">{fmtRelative(e.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      <footer className="mt-10 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>
          Data {t.source === "live" ? "live from Vanta" : "served from local fixtures"} · last
          synced {fmtRelative(t.generatedAt)}
        </span>
        <a
          href="https://github.com/VantaInc/vanta-mcp-server"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Powered by Vanta MCP
          <ExternalLink className="size-3" />
        </a>
      </footer>
    </div>
  );
}
