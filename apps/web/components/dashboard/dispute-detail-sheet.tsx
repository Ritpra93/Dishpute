"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeritBadge } from "./merit-badge";
import { StatusBadge } from "./status-badge";
import { PlatformPill, ChargeTypeLabel } from "./badges";
import { formatCentsPrecise, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { EnrichedDispute } from "@/lib/types";

interface Props {
  dispute: EnrichedDispute | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEscalate?: (id: string) => void;
  isEscalating?: boolean;
}

interface VoiceCallStatus {
  candidateId: string;
  elevenLabsConversationId: string;
  startedAt: string;
  endedAt: string | null;
  callOutcome: "recovered" | "still_denied" | "callback_requested" | null;
  recoveredCents: number | null;
  transcript: Array<{ role: string; message: string; timeInCallSecs: number }> | null;
}

const VOICE_URL =
  process.env["NEXT_PUBLIC_VOICE_URL"] ?? "http://localhost:4000";

const CALL_OUTCOME_LABEL: Record<string, string> = {
  recovered: "Recovered on call",
  still_denied: "Still denied — escalation logged",
  callback_requested: "Callback requested",
};

const CHARGE_TYPE_LABEL: Record<string, string> = {
  missing_item: "Missing item",
  wrong_item: "Wrong item",
  cold_food: "Cold food",
  order_never_arrived: "Not delivered",
  customer_cancel: "Customer cancel",
  unknown: "Other",
};

function useVoiceCallStatus(
  candidateId: string | null,
  enabled: boolean
): VoiceCallStatus | null {
  const [status, setStatus] = useState<VoiceCallStatus | null>(null);

  useEffect(() => {
    if (!candidateId || !enabled) {
      setStatus(null);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${VOICE_URL}/calls/status/${candidateId}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (res.status === 404) {
          setStatus(null);
        } else if (res.ok) {
          setStatus((await res.json()) as VoiceCallStatus);
        }
      } catch {
        // Voice server not running — UI just stays in the "no call yet" state.
      }
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [candidateId, enabled]);

  return status;
}

export function DisputeDetailSheet({
  dispute,
  open,
  onOpenChange,
  onEscalate,
  isEscalating,
}: Props) {
  const escalateToVoice = dispute?.outcome?.escalateToVoice ?? false;
  const voiceStatus = useVoiceCallStatus(
    dispute?.id ?? null,
    open && escalateToVoice
  );
  if (!dispute) return null;
  const c = dispute.classification;
  const isDenied = dispute.outcome?.outcome === "denied";

  async function startCall() {
    if (!onEscalate || !dispute) return;
    setCallStarted(true);
    onEscalate(dispute.id);
  }

  const outcomeLabel =
    voiceStatus?.callOutcome != null
      ? CALL_OUTCOME_LABEL[voiceStatus.callOutcome] ?? voiceStatus.callOutcome
      : null;
  const callFinished = voiceStatus != null && voiceStatus.callOutcome !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="space-y-2 border-b px-6 pb-5 pt-6">
          <div className="flex items-center justify-between">
            <PlatformPill platform={dispute.platform} />
            <StatusBadge dispute={dispute} />
          </div>
          <SheetTitle className="font-semibold tracking-tight">
            Order #{dispute.orderId.replace("ord_", "")} · <ChargeTypeLabel type={dispute.chargeType} />
          </SheetTitle>
          <SheetDescription>
            {dispute.itemsReported.map((i) => `${i.quantity}× ${i.name}`).join(", ")} · placed {relativeTime(dispute.chargeTimestamp)}
          </SheetDescription>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {c && <MeritBadge score={c.meritScore} />}
            <span className="text-xs text-muted-foreground">
              Charged {formatCentsPrecise(dispute.chargeAmountCents)}
              {c && (
                <> · Recoverable{" "}
                  <span className="font-medium text-money">{formatCentsPrecise(c.recoverableCents)}</span>
                </>
              )}
            </span>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-6 py-6 text-sm">
          {dispute.customerComment && (
            <Section title="Customer note">
              <p className="rounded-xl border bg-secondary/40 p-4 text-sm italic text-muted-foreground leading-relaxed">
                &ldquo;{dispute.customerComment}&rdquo;
              </p>
            </Section>
          )}

          {c && (
            <>
              <Section title="Reasoning">
                <p className="leading-relaxed text-muted-foreground">{c.reasoning}</p>
              </Section>

              <Section title="Drafted dispute">
                <pre className="whitespace-pre-wrap rounded-xl border bg-secondary/40 p-4 text-[13px] leading-relaxed text-foreground">
                  {c.draftedDisputeText}
                </pre>
              </Section>

              <Section title="Evidence cited">
                <ul className="space-y-1.5">
                  {c.evidenceCitations.map((e, i) => (
                    <li key={i} className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-money" />
                      {e}
                    </li>
                  ))}
                </ul>
              </Section>
            </>
          )}

          <Section title="Order items">
            <div className="rounded-xl border">
              {dispute.itemsReported.map((it, i) => (
                <div
                  key={i}
                  className={cn("flex items-center justify-between px-4 py-2.5 text-sm", i > 0 && "border-t")}
                >
                  <span>
                    <span className="text-muted-foreground">{it.quantity}×</span> {it.name}
                  </span>
                  <span className="tabular-nums">{formatCentsPrecise(it.refundAmountCents)}</span>
                </div>
              ))}
            </div>
          </Section>

          {dispute.submission && (
            <Section title="Submission">
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

          {(isDenied || escalateToVoice) && onEscalate && (
            <div className="rounded-2xl border border-denied-border/30 bg-denied-bg p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">Platform denied this dispute</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Automated denial — escalating to a human rep often recovers ~62%.
                  </p>
                </div>
                {!callStarted ? (
                  <Button onClick={startCall} disabled={isEscalating} size="sm">
                    {isEscalating ? "Dialing…" : "Escalate to voice"}
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs">
                    <span className="h-2 w-2 animate-pulse-dot rounded-full bg-live-pulse" />
                    Live call in progress
                  </span>
                )}
              </div>

              {(callStarted || voiceStatus) && (
                <div className="mt-4 space-y-3 rounded-xl border bg-card p-4 text-xs">
                  {voiceStatus && (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <span className="text-muted-foreground">
                        {callFinished
                          ? `Ended · ${relativeTime(voiceStatus.endedAt ?? voiceStatus.startedAt)}`
                          : "Live call in progress"}
                      </span>
                      {outcomeLabel && (
                        <Badge
                          variant={voiceStatus.callOutcome === "recovered" ? "money" : "warning"}
                        >
                          {outcomeLabel}
                        </Badge>
                      )}
                    </div>
                  )}

                  {voiceStatus?.callOutcome === "recovered" &&
                    voiceStatus.recoveredCents !== null && (
                      <p className="text-sm text-foreground">
                        Recovered{" "}
                        <span className="font-semibold tabular-nums text-money">
                          {formatCentsPrecise(voiceStatus.recoveredCents)}
                        </span>{" "}
                        on this call.
                      </p>
                    )}

                  {voiceStatus?.transcript && voiceStatus.transcript.length > 0 ? (
                    <ol className="space-y-2">
                      {voiceStatus.transcript.map((turn, i) => (
                        <li key={i} className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {turn.role === "agent" ? "Counter agent" : "Support rep"} ·{" "}
                            {Math.floor(turn.timeInCallSecs / 60)}:{(turn.timeInCallSecs % 60).toString().padStart(2, "0")}
                          </span>
                          <span>{turn.message}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className="space-y-1.5 text-muted-foreground">
                      <div className="mb-2 font-medium text-foreground">Counter agent → DoorDash Tier 2</div>
                      <div>00:02 · &ldquo;Calling about {dispute.orderId}, appealing denial of {c ? formatCentsPrecise(c.recoverableCents) : "the charge"}…&rdquo;</div>
                      <div>00:11 · Rep: &ldquo;Pulling up the case, one moment.&rdquo;</div>
                      <div>00:24 · Tool: lookup_order → resolved.</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {escalateToVoice && (
            <Section label="Voice call">
              <VoiceCallPanel
                status={voiceStatus}
                awaitingStart={isEscalating || (!voiceStatus && escalateToVoice)}
              />
            </Section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function VoiceCallPanel({
  status,
  awaitingStart,
}: {
  status: VoiceCallStatus | null;
  awaitingStart: boolean;
}) {
  if (!status) {
    return (
      <p className="text-sm text-muted-foreground">
        {awaitingStart
          ? "Dialing DoorDash support…"
          : "No call placed yet. Click escalate above to dial."}
      </p>
    );
  }

  const finished = status.callOutcome !== null;
  const outcomeLabel = status.callOutcome
    ? CALL_OUTCOME_LABEL[status.callOutcome] ?? status.callOutcome
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {finished
            ? `Ended · ${relativeTime(status.endedAt ?? status.startedAt)}`
            : "Live call in progress"}
        </span>
        {outcomeLabel && (
          <Badge variant={status.callOutcome === "recovered" ? "money" : "warning"}>
            {outcomeLabel}
          </Badge>
        )}
      </div>

      {status.callOutcome === "recovered" && status.recoveredCents !== null && (
        <p className="text-sm">
          Recovered{" "}
          <span className="font-semibold tabular-nums text-money">
            {formatCentsPrecise(status.recoveredCents)}
          </span>{" "}
          on this call.
        </p>
      )}

      {status.transcript && status.transcript.length > 0 && (
        <ol className="space-y-2 border-l border-border pl-4 text-sm">
          {status.transcript.map((turn, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {turn.role === "agent" ? "Counter agent" : "Support rep"} ·{" "}
                <span className="tabular-nums">
                  {Math.floor(turn.timeInCallSecs / 60)}:
                  {(turn.timeInCallSecs % 60).toString().padStart(2, "0")}
                </span>
              </span>
              <span>{turn.message}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
