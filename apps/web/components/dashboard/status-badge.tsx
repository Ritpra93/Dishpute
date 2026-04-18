import { Badge } from "@/components/ui/badge";
import type { EnrichedDispute } from "@/lib/types";

export function StatusBadge({ dispute }: { dispute: EnrichedDispute }) {
  if (dispute.outcome?.outcome === "approved") {
    return <Badge variant="money">Recovered</Badge>;
  }
  if (dispute.outcome?.outcome === "denied") {
    return <Badge variant="destructive">Denied</Badge>;
  }
  if (dispute.submission?.status === "submitted") {
    return <Badge variant="secondary">Submitted</Badge>;
  }
  if (dispute.submission?.status === "platform_rejected_at_submit") {
    return <Badge variant="destructive">Rejected at submit</Badge>;
  }
  if (dispute.classification?.shouldDispute === false) {
    return <Badge variant="muted">Skipped</Badge>;
  }
  if (dispute.classification) {
    return <Badge variant="outline">Ready</Badge>;
  }
  return <Badge variant="muted">New</Badge>;
}
