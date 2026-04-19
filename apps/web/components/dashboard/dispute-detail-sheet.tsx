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
import { formatCentsPrecise, relativeTime } from "@/lib/utils";
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
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
