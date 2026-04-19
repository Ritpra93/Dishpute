/**
 * Local fallback for the trust-center payload. Shape matches what apps/voice's
 * composite /api/vanta/trust-center endpoint returns (which itself rolls up the
 * official Vanta MCP tools: frameworks, controls, tests, integrations).
 *
 * apps/web/app/api/trust/route.ts proxies to apps/voice when TRUST_PROXY_URL is
 * set, and falls back to this fixture otherwise — so the dashboard never breaks
 * even when the voice service is offline.
 */

export interface TrustFramework {
  id: string;
  name: string;
  productFamily: string;
  completionPercent: number;
  status: "in_progress" | "monitored" | "certified";
  controlsCount: number;
  controlsCompletedCount: number;
  nextAuditDate: string | null;
}

export interface TrustIntegration {
  id: string;
  displayName: string;
  connectionStatus: "CONNECTED" | "CONFIGURED" | "DISCONNECTED";
  resourceKinds: string[];
  lastSyncAt: string;
}

export interface TrustEvent {
  timestamp: string;
  label: string;
  severity: "info" | "warn";
}

export interface TrustCenterPayload {
  source: "live" | "fixture";
  organization: string;
  monitoredBy: string;
  generatedAt: string;
  summary: {
    controlsTotal: number;
    controlsPassing: number;
    controlsFailing: number;
    testsTotal: number;
    testsPassing: number;
    testsNeedingAttention: number;
  };
  frameworks: TrustFramework[];
  integrations: TrustIntegration[];
  recentEvents: TrustEvent[];
}

export const TRUST_FIXTURE: TrustCenterPayload = {
  source: "fixture",
  organization: "Counter",
  monitoredBy: "Vanta",
  generatedAt: "2026-04-18T02:05:00.000Z",
  summary: {
    controlsTotal: 47,
    controlsPassing: 45,
    controlsFailing: 2,
    testsTotal: 312,
    testsPassing: 306,
    testsNeedingAttention: 6,
  },
  frameworks: [
    {
      id: "fw_soc2",
      name: "SOC 2 Type II",
      productFamily: "soc2",
      completionPercent: 84,
      status: "in_progress",
      controlsCount: 47,
      controlsCompletedCount: 39,
      nextAuditDate: "2026-09-12",
    },
    {
      id: "fw_iso27001",
      name: "ISO 27001",
      productFamily: "iso27001",
      completionPercent: 62,
      status: "in_progress",
      controlsCount: 93,
      controlsCompletedCount: 58,
      nextAuditDate: null,
    },
    {
      id: "fw_iso42001",
      name: "ISO 42001 (AI Management System)",
      productFamily: "iso42001",
      completionPercent: 48,
      status: "in_progress",
      controlsCount: 38,
      controlsCompletedCount: 18,
      nextAuditDate: null,
    },
    {
      id: "fw_gdpr",
      name: "GDPR",
      productFamily: "gdpr",
      completionPercent: 91,
      status: "monitored",
      controlsCount: 24,
      controlsCompletedCount: 22,
      nextAuditDate: null,
    },
    {
      id: "fw_ccpa",
      name: "CCPA",
      productFamily: "ccpa",
      completionPercent: 100,
      status: "monitored",
      controlsCount: 16,
      controlsCompletedCount: 16,
      nextAuditDate: null,
    },
  ],
  integrations: [
    {
      id: "int_github",
      displayName: "GitHub",
      connectionStatus: "CONNECTED",
      resourceKinds: ["Repository", "User", "Branch"],
      lastSyncAt: "2026-04-18T02:01:00.000Z",
    },
    {
      id: "int_aws",
      displayName: "AWS",
      connectionStatus: "CONNECTED",
      resourceKinds: ["S3Bucket", "IAMUser", "CloudTrailLog"],
      lastSyncAt: "2026-04-18T02:00:00.000Z",
    },
    {
      id: "int_okta",
      displayName: "Okta",
      connectionStatus: "CONNECTED",
      resourceKinds: ["User", "Group", "Application"],
      lastSyncAt: "2026-04-18T01:55:00.000Z",
    },
    {
      id: "int_gsuite",
      displayName: "Google Workspace",
      connectionStatus: "CONNECTED",
      resourceKinds: ["User", "Group"],
      lastSyncAt: "2026-04-18T01:48:00.000Z",
    },
    {
      id: "int_linear",
      displayName: "Linear",
      connectionStatus: "CONFIGURED",
      resourceKinds: ["Issue", "Project"],
      lastSyncAt: "2026-04-18T01:50:00.000Z",
    },
    {
      id: "int_stripe",
      displayName: "Stripe",
      connectionStatus: "CONNECTED",
      resourceKinds: ["Customer", "Charge"],
      lastSyncAt: "2026-04-18T01:42:00.000Z",
    },
    {
      id: "int_anthropic",
      displayName: "Anthropic API",
      connectionStatus: "CONNECTED",
      resourceKinds: ["APIKey", "AuditLog"],
      lastSyncAt: "2026-04-18T01:59:00.000Z",
    },
  ],
  recentEvents: [
    {
      timestamp: "2026-04-18T02:00:00.000Z",
      label: "S3 buckets encrypted at rest — passing",
      severity: "info",
    },
    {
      timestamp: "2026-04-18T01:59:00.000Z",
      label: "Anthropic API calls captured in audit trail — passing",
      severity: "info",
    },
    {
      timestamp: "2026-04-17T22:14:00.000Z",
      label: "GitHub organization enforces MFA — passing",
      severity: "info",
    },
    {
      timestamp: "2026-04-17T09:14:00.000Z",
      label: "Background check completed for new hire — passing",
      severity: "info",
    },
    {
      timestamp: "2026-04-14T12:45:00.000Z",
      label: "Vendor risk assessment due in 14 days — needs attention",
      severity: "warn",
    },
  ],
};
