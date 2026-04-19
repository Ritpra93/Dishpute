"use client";

import { ShieldCheck, ShieldAlert } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MeritBadge } from "./merit-badge";
import { StatusBadge } from "./status-badge";
import { formatCentsPrecise, relativeTime } from "@/lib/utils";
import type { EnrichedDispute } from "@/lib/types";
import type { EscalateResult } from "./dashboard-client";

interface Props {
  dispute: EnrichedDispute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEscalate?: (id: string) => void;
  isEscalating?: boolean;
  escalateResult?: EscalateResult | null;
}

const CHARGE_TYPE_LABEL: Record<string, string> = {
  missing_item: "Missing item",
  wrong_item: "Wrong item",
  cold_food: "Cold food",
  order_never_arrived: "Not delivered",
  customer_cancel: "Customer cancel",
  unknown: "Other",
};

export function DisputeDetailSheet({
  dispute,
  open,
  onOpenChange,
  onEscalate,
  isEscalating,
  escalateResult,
}: Props) {
  if (!dispute) return null;
  const c = dispute.classification;
  const denied = dispute.outcome?.outcome === "denied";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="font-mono">{dispute.id}</span>
            <span aria-hidden>·</span>
            <span>Order #{dispute.orderId.replace("ord_", "")}</span>
            <span aria-hidden>·</span>
            <span>{relativeTime(dispute.chargeTimestamp)}</span>
          </div>
          <SheetTitle>
            {CHARGE_TYPE_LABEL[dispute.chargeType] ?? dispute.chargeType} ·{" "}
            <span className="text-money tabular-nums">
              {formatCentsPrecise(dispute.chargeAmountCents)}
            </span>
          </SheetTitle>
          <SheetDescription>
            {dispute.itemsReported.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
          </SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <StatusBadge dispute={dispute} />
            {c && <MeritBadge score={c.meritScore} />}
            {dispute.outcome?.escalateToVoice && (
              <Badge variant="warning">Escalation candidate</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {dispute.customerComment && (
            <Section label="Customer note">
              <p className="rounded-md border bg-muted/40 p-3 text-sm italic text-muted-foreground">
                &ldquo;{dispute.customerComment}&rdquo;
              </p>
            </Section>
          )}

          {c && (
            <>
              <Section label="Counter's reasoning">
                <p className="text-sm leading-relaxed">{c.reasoning}</p>
              </Section>

              <Section label="Drafted dispute">
                <div className="rounded-md border bg-card p-4 text-sm leading-relaxed">
                  {c.draftedDisputeText}
                </div>
              </Section>

              <Section label="Evidence cited">
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {c.evidenceCitations.map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="text-money">·</span>
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section label="Recoverable">
                <p className="text-2xl font-semibold tabular-nums text-money">
                  {formatCentsPrecise(c.recoverableCents)}
                </p>
              </Section>
            </>
          )}

          {dispute.submission && (
            <Section label="Submission">
              <p className="text-sm text-muted-foreground">
                {dispute.submission.status === "submitted" ? (
                  <>
                    Submitted to platform · confirmation{" "}
                    <span className="font-mono text-foreground">
                      {dispute.submission.platformConfirmationId}
                    </span>{" "}
                    · {relativeTime(dispute.submission.submittedAt)}
                  </>
                ) : (
                  <>{dispute.submission.errorMessage ?? dispute.submission.status}</>
                )}
              </p>
            </Section>
          )}

          {denied && onEscalate && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-semibold">Platform denied this dispute.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Escalate to a voice agent that will call the platform&apos;s support line and
                argue the case in real time.
              </p>
              <Button
                className="mt-3"
                variant="money"
                onClick={() => onEscalate(dispute.id)}
                disabled={isEscalating}
              >
                {isEscalating ? "Calling support…" : "Escalate to voice agent"}
              </Button>

              {escalateResult && escalateResult.candidateId === dispute.id && (
                <div className="mt-3 rounded-md border bg-background p-3 text-xs">
                  {(escalateResult.kind === "live" || escalateResult.kind === "stubbed") &&
                    escalateResult.vantaGate && (
                      <VantaGatePassedBadge gate={escalateResult.vantaGate} />
                    )}
                  {escalateResult.kind === "live" && (
                    <>
                      <p className="font-semibold text-money">
                        Call placed
                        {escalateResult.toNumber ? (
                          <>
                            {" "}
                            · dialing{" "}
                            <span className="font-mono">{escalateResult.toNumber}</span>
                          </>
                        ) : null}
                      </p>
                      {escalateResult.conversationId && (
                        <p className="mt-1 text-muted-foreground">
                          conversation{" "}
                          <span className="font-mono">
                            {escalateResult.conversationId}
                          </span>
                        </p>
                      )}
                      {escalateResult.callSid && (
                        <p className="mt-1 text-muted-foreground">
                          callSid{" "}
                          <span className="font-mono">{escalateResult.callSid}</span>
                        </p>
                      )}
                    </>
                  )}
                  {escalateResult.kind === "stubbed" && (
                    <>
                      <p className="font-semibold">Stubbed escalation</p>
                      <p className="mt-1 text-muted-foreground">
                        {escalateResult.message}
                      </p>
                    </>
                  )}
                  {escalateResult.kind === "blocked" && (
                    <>
                      <p className="flex items-center gap-1.5 font-semibold text-destructive">
                        <ShieldAlert className="size-3.5" />
                        Blocked by Vanta pre-flight
                      </p>
                      <p className="mt-1 text-muted-foreground">{escalateResult.reason}</p>
                      {escalateResult.failingCritical.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-muted-foreground">
                          {escalateResult.failingCritical.map((t) => (
                            <li key={t.id} className="flex items-start gap-1.5">
                              <span aria-hidden className="text-destructive">·</span>
                              <span>
                                <span className="font-medium text-foreground">{t.name}</span>
                                <span className="ml-1 uppercase tracking-wider">
                                  ({t.category})
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="mt-2 text-muted-foreground">
                        {escalateResult.controlsChecked} control(s) evaluated · the agent will
                        not act until these are remediated.
                      </p>
                    </>
                  )}
                  {escalateResult.kind === "error" && (
                    <>
                      <p className="font-semibold text-destructive">
                        Escalation failed
                        {escalateResult.code === "voice_unreachable"
                          ? " — apps/voice unreachable"
                          : escalateResult.code === "voice_upstream_error"
                            ? ` — apps/voice returned ${escalateResult.upstreamStatus ?? "an error"}`
                            : ""}
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        {escalateResult.hint ??
                          "Check the apps/voice server logs and ELEVENLABS_* env vars."}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function VantaGatePassedBadge({
  gate,
}: {
  gate: { source: "live" | "fixture" | "unreachable"; controlsChecked: number };
}) {
  const sourceLabel =
    gate.source === "live"
      ? "live Vanta tenant"
      : gate.source === "fixture"
        ? "fixture data"
        : "unreachable, failed open";
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="money"
            className="mb-2 inline-flex cursor-help items-center gap-1.5 px-2 py-0.5 text-[10px]"
          >
            <ShieldCheck className="size-3" /> Vanta pre-flight: passed
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          <p className="font-semibold">Vanta pre-flight gate</p>
          <p className="mt-1 text-muted-foreground">
            {gate.controlsChecked} SOC 2 control(s) evaluated against critical categories
            (data_security, access_control, ai_governance) before this autonomous action was
            authorized.
          </p>
          <p className="mt-1 text-muted-foreground">Source: {sourceLabel}.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
