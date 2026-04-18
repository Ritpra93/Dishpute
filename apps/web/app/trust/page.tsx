import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TRUST_FIXTURE } from "@/lib/trust-fixture";

export const dynamic = "force-dynamic";

const SOC_LABEL: Record<string, string> = {
  soc2_type_2: "SOC 2 Type II",
  soc2_type_1: "SOC 2 Type I",
};

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

export default function TrustPage() {
  const t = TRUST_FIXTURE;
  const passingPct = Math.round((t.controls.passing / t.controls.monitored) * 100);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to dashboard
      </Link>

      <header className="mt-4 mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Counter Inc.
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Trust center</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Counter handles your delivery-platform credentials and dispute records. We&apos;re
            continuously monitored by Vanta against industry compliance frameworks.
          </p>
        </div>
        <Badge variant="money" className="gap-1.5 px-3 py-1.5">
          <ShieldCheck className="size-3.5" /> Monitored by {t.monitoredBy}
        </Badge>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{SOC_LABEL[t.socStatus.type]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {t.socStatus.progressPercent}%
            </p>
            <Progress value={t.socStatus.progressPercent} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Next audit · {fmtDate(t.socStatus.nextAuditDate)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Controls passing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {t.controls.passing}
              <span className="text-base font-normal text-muted-foreground">
                {" "}/ {t.controls.monitored}
              </span>
            </p>
            <Progress value={passingPct} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {t.controls.failing} controls under remediation
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
              {t.integrations.filter((i) => i.status === "connected").length} connected ·{" "}
              {t.integrations.filter((i) => i.status === "configured").length} configured
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
                  <span className="font-medium text-foreground">{f.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {f.coverage}%
                  </span>
                </div>
                <Progress value={f.coverage} className="mt-1.5" />
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
                  {i.status === "connected" ? (
                    <CheckCircle2 className="size-3.5 text-money" />
                  ) : (
                    <AlertTriangle className="size-3.5 text-amber-500" />
                  )}
                  <span className="flex-1">{i.label}</span>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {i.status}
                  </span>
                </div>
              ))}
            </div>
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
                    <p className="text-xs text-muted-foreground">
                      {fmtRelative(e.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
