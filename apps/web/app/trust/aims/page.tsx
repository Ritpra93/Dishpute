import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Undo2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// AI Impact Assessment for Counter's dispute agent, structured against the
// ISO/IEC 42001:2023 AI Management System (AIMS) standard. Section numbers
// reference the published ISO 42001 clause numbers so a Vanta or compliance
// reviewer can map each claim back to the spec.

const RISKS: Array<{
  id: string;
  title: string;
  likelihood: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  mitigation: string;
}> = [
  {
    id: "risk_hallucinated_evidence",
    title: "Hallucinated evidence in voice escalation",
    likelihood: "medium",
    impact: "high",
    mitigation:
      "Voice agent only cites evidence the operator has approved in the dashboard. The reference_evidence tool returns pre-formatted citations from our SQLite store; the LLM cannot generate new evidence text mid-call.",
  },
  {
    id: "risk_wrong_merchant",
    title: "Acting on the wrong merchant or dispute",
    likelihood: "low",
    impact: "high",
    mitigation:
      "Every escalation request includes a verified case_id that is foreign-keyed to dispute_candidates. The agent confirms case_number on the call before discussing details.",
  },
  {
    id: "risk_agent_misrepresentation",
    title: "Agent failing to disclose it is automated",
    likelihood: "low",
    impact: "high",
    mitigation:
      "System prompt requires the agent to identify itself as automated in the opening sentence of every call. This is non-negotiable and is verified in the post-call transcript review.",
  },
  {
    id: "risk_compliance_drift",
    title: "Acting while underlying SOC 2 controls have regressed",
    likelihood: "medium",
    impact: "medium",
    mitigation:
      "Pre-flight Vanta gate: every /api/disputes/[id]/escalate call queries Vanta tests for failing critical controls and returns 409 Conflict if any are found. Audit log records gate decisions.",
  },
  {
    id: "risk_unauthorized_outbound",
    title: "Agent dialing without operator approval",
    likelihood: "low",
    impact: "high",
    mitigation:
      "The voice service exposes no autonomous trigger. Outbound calls only fire when the dashboard's escalate route is invoked by an authenticated operator click.",
  },
];

function severityBadge(level: "low" | "medium" | "high") {
  if (level === "high") return <Badge className="bg-red-500/15 text-red-700">High</Badge>;
  if (level === "medium")
    return <Badge className="bg-amber-500/15 text-amber-700">Medium</Badge>;
  return <Badge className="bg-emerald-500/15 text-emerald-700">Low</Badge>;
}

export default function AimsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/trust"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to trust center
      </Link>

      <header className="mt-4 mb-8 flex items-end justify-between gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            ISO/IEC 42001:2023 · AI Management System
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            AI Impact Assessment — Dispute Agent
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            How Counter governs its autonomous dispute agent. Every section maps to a clause in
            ISO/IEC 42001:2023, the international standard for AI Management Systems.
          </p>
        </div>
        <Badge variant="money" className="gap-1.5 px-3 py-1.5">
          <ShieldCheck className="size-3.5" /> AIMS in scope
        </Badge>
      </header>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>1 — Purpose &amp; scope (clause 4.1, 4.3)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground">What the agent does</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  Classifies denied delivery-platform disputes into actionable categories using
                  Anthropic Claude with structured output schemas.
                </li>
                <li>
                  Assembles supporting evidence from the merchant&apos;s POS and prior dispute
                  records.
                </li>
                <li>
                  When approved by an operator, places an outbound voice call to the platform&apos;s
                  support line via ElevenLabs Conversational AI to advocate for the merchant.
                </li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">What the agent does NOT do</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  Initiate any outbound action without explicit operator approval in the dashboard.
                </li>
                <li>
                  Generate or fabricate evidence. Citations come exclusively from the
                  merchant-provided POS record and prior dispute fixtures.
                </li>
                <li>
                  Pretend to be human. The agent is required to disclose it is automated at the
                  start of every call.
                </li>
                <li>
                  Take any action when SOC 2 critical controls are failing (see §4 below).
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle>2 — Data flows (clause 7.5, 8.4)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
{`Scraper (TinyFish)
   ↓ scraped dispute → dispute_candidates table
Classifier (Anthropic Claude)
   ↓ category + recommended action → classifications table
Operator (dashboard)
   ↓ reviews + clicks "Call platform"
Pre-flight Vanta gate
   ↓ tests/controls posture verified — block if failing
Voice escalation (ElevenLabs)
   ↓ outbound call with redacted dynamic_variables
Post-call webhook (HMAC-verified)
   ↓ transcript + outcome → voice_calls table
Audit log
   ↓ immutable record with operator id, gate decision, conversation_id`}
            </pre>
            <p>
              Customer-identifying fields are never sent to the voice agent. Dynamic variables are
              limited to <code className="rounded bg-muted px-1">case_number</code>,{" "}
              <code className="rounded bg-muted px-1">merchant_name</code>,{" "}
              <code className="rounded bg-muted px-1">denial_reason</code>, and an opaque{" "}
              <code className="rounded bg-muted px-1">case_id</code>.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="size-4" />
              3 — Human-in-the-loop gates (clause 6.1.4, 8.3)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-money" />
              <span>
                <span className="font-medium text-foreground">Gate 1 — Classification review.</span>{" "}
                The classifier&apos;s recommendation is shown to the operator. No downstream action
                fires until the operator opens the dispute.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-money" />
              <span>
                <span className="font-medium text-foreground">Gate 2 — Explicit escalate click.</span>{" "}
                Voice escalation requires a deliberate operator action. There is no autonomous
                trigger anywhere in the codebase.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-money" />
              <span>
                <span className="font-medium text-foreground">Gate 3 — Vanta pre-flight.</span>{" "}
                The escalate route queries Vanta for failing tests in critical categories
                (data_security, access_control, ai_governance) and returns 409 Conflict if any
                exist. Result is recorded in the audit log.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-4 text-money" />
              <span>
                <span className="font-medium text-foreground">Gate 4 — On-call kill switch.</span>{" "}
                Setting <code className="rounded bg-muted px-1">VOICE_ESCALATE_URL</code> empty
                immediately disables outbound calls without any code deploy.
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              4 — Risk register (clause 6.1.2, 6.1.3, Annex A.5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 font-medium">Risk</th>
                  <th className="py-2 pr-3 font-medium">Likelihood</th>
                  <th className="py-2 pr-3 font-medium">Impact</th>
                  <th className="py-2 font-medium">Mitigation</th>
                </tr>
              </thead>
              <tbody>
                {RISKS.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 align-top">
                    <td className="py-3 pr-3 font-medium text-foreground">{r.title}</td>
                    <td className="py-3 pr-3">{severityBadge(r.likelihood)}</td>
                    <td className="py-3 pr-3">{severityBadge(r.impact)}</td>
                    <td className="py-3 text-muted-foreground">{r.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Undo2 className="size-4" />
              5 — Rollback &amp; incident response (clause 8.4, 10.2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Kill switch.</span> Any operator can
              revoke the agent&apos;s outbound capability by unsetting{" "}
              <code className="rounded bg-muted px-1">VOICE_ESCALATE_URL</code> in the running web
              app. No deploy required.
            </p>
            <p>
              <span className="font-medium text-foreground">Evidence retention.</span> All call
              transcripts, classifier prompts, and Vanta gate decisions are retained for 18 months
              in the encrypted audit log so any decision can be reconstructed.
            </p>
            <p>
              <span className="font-medium text-foreground">Post-incident review.</span> Any call
              flagged in transcript review (agent identity not disclosed, evidence misstated, or
              merchant complaint) triggers a tabletop within 5 business days. Findings update this
              risk register and the agent system prompt.
            </p>
            <p>
              <span className="font-medium text-foreground">Reversal procedure.</span> If the
              voice agent obtains an incorrect concession from a platform rep, the operator can
              call back through the same workflow and request reversal — every conversation_id is
              referenced in the audit log so the prior call can be cited.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mb-10">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>6 — Continuous improvement (clause 9, 10)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Counter monitors the dispute agent through the same Vanta tenant that monitors our
              SOC 2 posture. Tests in the <code className="rounded bg-muted px-1">ai_governance</code>{" "}
              category — including <em>&ldquo;Voice escalation requires operator approval&rdquo;</em> and{" "}
              <em>&ldquo;Anthropic API calls captured in audit trail&rdquo;</em> — are reviewed
              monthly.
            </p>
            <p>
              This document is reviewed quarterly and after any material change to the agent&apos;s
              system prompt, tool surface, or human-in-the-loop gating.
            </p>
          </CardContent>
        </Card>
      </section>

      <footer className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>Last reviewed · Apr 18, 2026 · Owner: security@counter.com</span>
        <a
          href="https://www.iso.org/standard/81230.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          ISO/IEC 42001:2023
          <ExternalLink className="size-3" />
        </a>
      </footer>
    </div>
  );
}
