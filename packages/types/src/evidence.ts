/**
 * Evidence bundle artifact — what the W3 PDF renderer ingests and what
 * Worker 1's future evidence-bundler emits. Single shape so swapping the
 * fixture for the real source is a one-line import change.
 */

export type EvidenceArtifactKind =
  | "screenshot"
  | "dom_element"
  | "video_clip"
  | "receipt_text"
  | "claude_annotation";

export interface EvidenceArtifact {
  candidateId: string;
  kind: EvidenceArtifactKind;
  /** Title shown above the artifact in the bundle (e.g., "Step 3 — submit click"). */
  title: string;
  /** ISO timestamp captured at the source step. */
  capturedAt: string;
  /** Page URL or DOM step the artifact was captured at. */
  source?: string;
  /** Free-form caption — usually Claude's annotation explaining the artifact. */
  claudeAnnotation?: string;
  /** Inline image data URL (`data:image/jpeg;base64,...`) — used for screenshots. */
  imageDataUrl?: string;
  /** Path under `apps/web/lib/fixtures/evidence/` for fixture-mode images. */
  imageFixturePath?: string;
  /** Plain-text body — used for `receipt_text`, `dom_element`, `claude_annotation`. */
  text?: string;
  /** Presigned URL — used for `video_clip`. Expires after 15 minutes. */
  videoUrl?: string;
}

/** A complete bundle = cover page + ordered artifacts for one candidate. */
export interface EvidenceBundle {
  candidateId: string;
  caseNumber: string;
  merchantName: string;
  generatedAt: string;
  totalRecoverableCents: number;
  summary: string;
  artifacts: EvidenceArtifact[];
}
