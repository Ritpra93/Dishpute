import { cn } from "@/lib/utils";
import type { EnrichedDispute } from "@/lib/types";

export function StatusBadge({ dispute }: { dispute: EnrichedDispute }) {
  if (dispute.outcome?.outcome === "approved") {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-merit-high-bg text-merit-high-fg")}>
        Approved
      </span>
    );
  }
  if (dispute.outcome?.escalateToVoice || dispute.outcome?.outcome === "denied" && dispute.outcome?.escalateToVoice) {
    return (
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-merit-mid-bg text-merit-mid-fg")}>
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-live-pulse" />
        Escalating · voice
      </span>
    );
  }
  if (dispute.outcome?.outcome === "denied") {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-denied-bg text-foreground border border-denied-border/40")}>
        Denied
      </span>
    );
  }
  if (dispute.submission?.status === "submitted") {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-merit-low-bg text-merit-low-fg")}>
        Submitted
      </span>
    );
  }
  if (dispute.submission?.status === "platform_rejected_at_submit") {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-denied-bg text-foreground border border-denied-border/40")}>
        Rejected
      </span>
    );
  }
  if (dispute.classification?.shouldDispute === false) {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-muted text-muted-foreground")}>
        Skipped
      </span>
    );
  }
  if (dispute.classification) {
    return (
      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-secondary text-secondary-foreground")}>
        Queued
      </span>
    );
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", "bg-muted text-muted-foreground")}>
      New
    </span>
  );
}
