/**
 * Pre-dispute early-warning record — emitted by the W7 SSE feed when an
 * order trips a "likely-to-be-error-charged" heuristic before the platform
 * deducts. Click-through opens a pre-bundled W3 evidence modal.
 */

export type EarlyWarningSeverity = "info" | "watch" | "imminent";

export type EarlyWarningCategory =
  | "missing_item_pattern"
  | "delivery_timeout"
  | "address_mismatch"
  | "auto_refund_imminent"
  | "review_swarm";

export interface EarlyWarning {
  id: string;
  /** Synthetic candidate ID we mint at warning time. Becomes the real candidateId once it converts. */
  candidateId: string;
  orderId: string;
  platform: "doordash" | "ubereats" | "grubhub";
  severity: EarlyWarningSeverity;
  category: EarlyWarningCategory;
  title: string;
  detail: string;
  /** ISO timestamp when the auto-refund / charge is expected to land. */
  expectedAt: string;
  /** Recoverable amount we'd defend if we file pre-emptively. */
  potentialChargeCents: number;
  /** Pre-bundled artifacts ready for the W3 modal. */
  artifactIds?: string[];
  createdAt: string;
}
