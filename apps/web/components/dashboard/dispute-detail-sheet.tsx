"use client";

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
