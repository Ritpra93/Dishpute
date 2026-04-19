import { TopNav } from "@/components/top-nav";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShieldCheck, Lock, Server, FileCheck, Eye } from "lucide-react";
import { TRUST_FIXTURE } from "@/lib/trust-fixture";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ControlStatus = "passing" | "in_progress" | "failing";

const TRUST_CONTROLS: Array<{
  id: string;
  name: string;
  category: string;
  status: ControlStatus;
  owner: string;
}> = [
  { id: "CC1.1", name: "Code of Conduct published", category: "Security", status: "passing", owner: "People Ops" },
  { id: "CC2.1", name: "Background checks for engineers", category: "Security", status: "passing", owner: "People Ops" },
  { id: "CC6.1", name: "Production access via SSO+MFA", category: "Security", status: "passing", owner: "Eng" },
  { id: "CC6.6", name: "Encryption at rest (AES-256)", category: "Confidentiality", status: "passing", owner: "Eng" },
  { id: "CC6.7", name: "TLS 1.3 in transit", category: "Confidentiality", status: "passing", owner: "Eng" },
  { id: "CC7.2", name: "Continuous vulnerability scanning", category: "Security", status: "passing", owner: "Eng" },
  { id: "CC7.4", name: "Incident response plan", category: "Availability", status: "in_progress", owner: "Eng" },
  { id: "A1.2", name: "Daily encrypted backups", category: "Availability", status: "passing", owner: "Eng" },
  { id: "A1.3", name: "Quarterly DR drill", category: "Availability", status: "in_progress", owner: "Eng" },
  { id: "C1.1", name: "Customer data isolation", category: "Confidentiality", status: "passing", owner: "Eng" },
  { id: "P3.1", name: "Data subject access requests", category: "Privacy", status: "passing", owner: "Legal" },
  { id: "P4.2", name: "PII retention policy", category: "Privacy", status: "in_progress", owner: "Legal" },
];

const SUB_PROCESSORS = [
  { name: "AWS", purpose: "Infrastructure hosting", region: "us-east-1, us-west-2" },
  { name: "Stripe", purpose: "Payouts & Connect", region: "US, EU" },
  { name: "Twilio", purpose: "Voice telephony", region: "US" },
  { name: "ElevenLabs", purpose: "Voice synthesis", region: "US" },
  { name: "Resend", purpose: "Transactional email", region: "US" },
  { name: "Sentry", purpose: "Error monitoring", region: "US" },
];

export default function TrustPage() {
  const t = TRUST_FIXTURE;
  const passing = TRUST_CONTROLS.filter((c) => c.status === "passing").length;
  const total = 52;

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="glass mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-money">
            <ShieldCheck className="h-3.5 w-3.5" /> SOC 2 Type II · Active
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Trust at Counter
          </h1>
          <p className="mt-3 max-w-xl text-sm text-foreground/70">
            We handle settlement data and platform credentials for restaurants. Here&apos;s exactly how we keep them safe.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <TrustCard title="Compliance" icon={<FileCheck className="h-4 w-4 text-money" />}>
            <div className="text-2xl font-semibold tabular-nums">{passing}/{total}</div>
            <div className="mt-1 text-xs text-muted-foreground">controls passing</div>
            <Progress value={(passing / total) * 100} className="mt-3 h-1.5" />
          </TrustCard>
          <TrustCard title="Encryption" icon={<Lock className="h-4 w-4 text-money" />}>
            <div className="text-2xl font-semibold tabular-nums">AES-256 · TLS 1.3</div>
            <div className="mt-1 text-xs text-muted-foreground">at rest &amp; in transit</div>
          </TrustCard>
          <TrustCard title="Uptime (90d)" icon={<Server className="h-4 w-4 text-money" />}>
            <div className="text-2xl font-semibold tabular-nums">
              {t.socStatus.progressPercent}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Next audit · {new Date(t.socStatus.nextAuditDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          </TrustCard>
        </div>

        <Section title="Controls">
          <div className="glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">ID</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="pr-5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRUST_CONTROLS.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-5 font-mono text-xs text-muted-foreground">{c.id}</TableCell>
                    <TableCell className="text-sm">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.owner}</TableCell>
                    <TableCell className="pr-5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          c.status === "passing" && "bg-merit-high-bg text-merit-high-fg",
                          c.status === "in_progress" && "bg-merit-mid-bg text-merit-mid-fg",
                          c.status === "failing" && "bg-denied-bg text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            c.status === "passing" && "bg-money",
                            c.status === "in_progress" && "bg-merit-mid-fg",
                            c.status === "failing" && "bg-denied-border",
                          )}
                        />
                        {c.status === "passing" ? "Passing" : c.status === "in_progress" ? "In progress" : "Failing"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Sub-processors">
          <div className="glass overflow-hidden rounded-2xl">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Vendor</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead className="pr-5">Region</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SUB_PROCESSORS.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="pl-5 font-medium">{s.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.purpose}</TableCell>
                    <TableCell className="pr-5 text-sm text-muted-foreground">{s.region}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="Security practices">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              { i: <Lock className="h-4 w-4" />, t: "Least-privilege access", d: "Production access via SSO with hardware MFA. Quarterly access reviews." },
              { i: <Eye className="h-4 w-4" />, t: "Continuous monitoring", d: "All API calls and admin actions are logged and retained for 12 months." },
              { i: <Server className="h-4 w-4" />, t: "Isolated tenants", d: "Each merchant's data is partitioned with row-level security." },
              { i: <ShieldCheck className="h-4 w-4" />, t: "Penetration testing", d: "Annual third-party pentest. Latest report available under NDA." },
            ].map((p) => (
              <div key={p.t} className="glass flex gap-3 rounded-2xl p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-money-soft text-money-soft-foreground">
                  {p.i}
                </div>
                <div>
                  <div className="text-sm font-semibold">{p.t}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}

function TrustCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground/70">{title}</h2>
      {children}
    </section>
  );
}
