/**
 * Inline mocked Vanta trust-center payload.
 *
 * MERGE NOTE: When apps/voice ships /api/vanta/trust-center, swap
 * apps/web/app/api/trust/route.ts to proxy that endpoint and delete this file.
 */

export interface TrustCenterPayload {
  monitoredBy: string;
  status: "monitored" | "in_progress" | "certified";
  socStatus: {
    type: "soc2_type_2" | "soc2_type_1";
    progressPercent: number;
    nextAuditDate: string;
  };
  controls: {
    monitored: number;
    passing: number;
    failing: number;
  };
  frameworks: Array<{
    id: string;
    label: string;
    coverage: number;
  }>;
  integrations: Array<{
    id: string;
    label: string;
    status: "connected" | "configured" | "pending";
  }>;
  recentEvents: Array<{
    timestamp: string;
    label: string;
    severity: "info" | "warn";
  }>;
}

export const TRUST_FIXTURE: TrustCenterPayload = {
  monitoredBy: "Vanta",
  status: "monitored",
  socStatus: {
    type: "soc2_type_2",
    progressPercent: 84,
    nextAuditDate: "2026-09-12",
  },
  controls: {
    monitored: 47,
    passing: 45,
    failing: 2,
  },
  frameworks: [
    { id: "soc2", label: "SOC 2 Type II", coverage: 84 },
    { id: "iso27001", label: "ISO 27001", coverage: 62 },
    { id: "ccpa", label: "CCPA", coverage: 100 },
    { id: "gdpr", label: "GDPR", coverage: 91 },
  ],
  integrations: [
    { id: "github", label: "GitHub", status: "connected" },
    { id: "aws", label: "AWS", status: "connected" },
    { id: "okta", label: "Okta", status: "connected" },
    { id: "gsuite", label: "Google Workspace", status: "connected" },
    { id: "linear", label: "Linear", status: "configured" },
    { id: "stripe", label: "Stripe", status: "connected" },
    { id: "twilio", label: "Twilio", status: "configured" },
  ],
  recentEvents: [
    {
      timestamp: "2026-04-17T09:14:00Z",
      label: "Background check completed for new hire",
      severity: "info",
    },
    {
      timestamp: "2026-04-16T22:01:00Z",
      label: "Quarterly access review opened",
      severity: "info",
    },
    {
      timestamp: "2026-04-15T03:18:00Z",
      label: "S3 bucket policy verified — encrypted at rest",
      severity: "info",
    },
    {
      timestamp: "2026-04-14T12:45:00Z",
      label: "Vendor risk assessment due in 14 days",
      severity: "warn",
    },
  ],
};
