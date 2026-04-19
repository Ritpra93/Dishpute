import { Router, type Router as ExpressRouter } from "express";

// Mocked Vanta trust-center payload. Shape is hand-chosen so the dashboard's
// /trust page can render authentically without a real Vanta tenant.
// See apps/voice/CLAUDE.md → Task 6 and docs/VERIFIED_APIS.md (Vanta section).

const router: ExpressRouter = Router();

router.get("/api/vanta/trust-center", (_req, res) => {
  const now = Date.now();

  res.json({
    organization: "Counter",
    generated_at: new Date(now).toISOString(),
    controls: {
      total: 52,
      monitored: 47,
      failing: 2,
      not_applicable: 3,
    },
    frameworks: [
      { name: "SOC 2 Type II", status: "in_progress", progress_pct: 73 },
      { name: "HIPAA", status: "monitored", progress_pct: 100 },
      { name: "GDPR", status: "monitored", progress_pct: 94 },
    ],
    last_scan: new Date(now - 2 * 60_000).toISOString(),
    integrations: [
      {
        name: "GitHub",
        status: "connected",
        last_sync: new Date(now - 3 * 60_000).toISOString(),
      },
      {
        name: "AWS",
        status: "connected",
        last_sync: new Date(now - 7 * 60_000).toISOString(),
      },
      {
        name: "Okta",
        status: "connected",
        last_sync: new Date(now - 12 * 60_000).toISOString(),
      },
      {
        name: "Linear",
        status: "connected",
        last_sync: new Date(now - 4 * 60_000).toISOString(),
      },
      {
        name: "Anthropic API",
        status: "connected",
        last_sync: new Date(now - 1 * 60_000).toISOString(),
      },
    ],
    recent_events: [
      {
        id: "evt_4471",
        type: "control_passed",
        message: "Access-review control re-verified for GitHub org",
        occurred_at: new Date(now - 11 * 60_000).toISOString(),
      },
      {
        id: "evt_4470",
        type: "integration_synced",
        message: "AWS CloudTrail logs ingested successfully",
        occurred_at: new Date(now - 18 * 60_000).toISOString(),
      },
      {
        id: "evt_4469",
        type: "policy_acknowledged",
        message: "Data-retention policy acknowledged by 4/4 employees",
        occurred_at: new Date(now - 63 * 60_000).toISOString(),
      },
    ],
  });
});

export default router;
