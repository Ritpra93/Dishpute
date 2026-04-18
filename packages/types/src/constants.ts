/** Disputes must be filed within this window of the charge timestamp. */
export const DISPUTE_WINDOW_DAYS = 14;

/** Merit-score thresholds used across modules. */
export const MERIT_THRESHOLDS = {
  /** Submit automatically without human review. */
  AUTO_SUBMIT: 70,
  /** Queue for human review; do not auto-submit. */
  HUMAN_REVIEW: 40,
  /** Do not dispute — platform is likely correct. */
  SKIP: 0,
} as const;

/** Contingency fee as a decimal (20%). */
export const CONTINGENCY_FEE_RATE = 0.2;

/** Only escalate denials with at least this merit score. */
export const VOICE_ESCALATION_MIN_MERIT = 70;

/** Dispute submission concurrency when batching. */
export const SUBMIT_CONCURRENCY = 5;

/** Classifier concurrency when batching. */
export const CLASSIFIER_CONCURRENCY = 10;
