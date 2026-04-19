import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import {
  getVantaClient,
  type VantaControl,
  type VantaDocument,
  type VantaEnvelope,
  type VantaFramework,
  type VantaIntegration,
  type VantaTest,
} from "../lib/vanta-mcp";

// Vanta MCP-shaped REST endpoints. Each path corresponds 1:1 with a tool from
// @vantasdk/vanta-mcp-server (https://github.com/VantaInc/vanta-mcp-server).
// In production we proxy real Vanta data when VANTA_ENV_FILE is set; otherwise
// we serve fixtures shaped identically to live responses so the dashboard,
// /trust page, and pre-flight gate all behave the same way in the demo.

const router: ExpressRouter = Router();
const vanta = getVantaClient();

router.get("/api/vanta/frameworks", async (_req: Request, res: Response) => {
  const result = await vanta.callTool<VantaEnvelope<VantaFramework>>("frameworks");
  res.json(result);
});

router.get("/api/vanta/controls", async (req: Request, res: Response) => {
  const args: Record<string, unknown> = {};
  if (req.query["frameworkId"]) args["frameworkId"] = String(req.query["frameworkId"]);
  const result = await vanta.callTool<VantaEnvelope<VantaControl>>("controls", args);
  res.json(result);
});

router.get("/api/vanta/tests", async (req: Request, res: Response) => {
  const args: Record<string, unknown> = {};
  if (req.query["statusFilter"]) args["statusFilter"] = String(req.query["statusFilter"]);
  if (req.query["frameworkFilter"]) args["frameworkFilter"] = String(req.query["frameworkFilter"]);
  if (req.query["integrationFilter"])
    args["integrationFilter"] = String(req.query["integrationFilter"]);

  const result = await vanta.callTool<VantaEnvelope<VantaTest>>("tests", args);

  // Apply client-side filters when serving fixtures so the pre-flight gate
  // can reliably ask "any failing tests in framework=soc2?" without having to
  // post-filter at every call site.
  if (result.source === "fixture") {
    let data = result.data.results.data;
    if (args["statusFilter"]) data = data.filter((t) => t.status === args["statusFilter"]);
    if (args["frameworkFilter"])
      data = data.filter((t) => t.frameworkFilter === args["frameworkFilter"]);
    if (args["integrationFilter"])
      data = data.filter((t) => t.integrationFilter === args["integrationFilter"]);
    res.json({
      ...result,
      data: { ...result.data, results: { ...result.data.results, data } },
    });
    return;
  }

  res.json(result);
});

router.get("/api/vanta/integrations", async (_req: Request, res: Response) => {
  const result = await vanta.callTool<VantaEnvelope<VantaIntegration>>("integrations");
  res.json(result);
});

router.get("/api/vanta/documents", async (_req: Request, res: Response) => {
  const result = await vanta.callTool<VantaEnvelope<VantaDocument>>("documents");
  res.json(result);
});

/**
 * Composite endpoint kept for the dashboard /trust page. Rolls up the four
 * underlying tool calls into a single response so the page renders in one fetch
 * instead of fan-out. Not an MCP tool — this is our own shape.
 */
router.get("/api/vanta/trust-center", async (_req: Request, res: Response) => {
  const [frameworks, controls, tests, integrations] = await Promise.all([
    vanta.callTool<VantaEnvelope<VantaFramework>>("frameworks"),
    vanta.callTool<VantaEnvelope<VantaControl>>("controls"),
    vanta.callTool<VantaEnvelope<VantaTest>>("tests"),
    vanta.callTool<VantaEnvelope<VantaIntegration>>("integrations"),
  ]);

  // The "source" of the rollup is "live" only if every underlying call was
  // live. Any single fixture fallback degrades the whole response.
  const source = [frameworks, controls, tests, integrations].every((r) => r.source === "live")
    ? "live"
    : "fixture";

  const controlList = controls.data.results.data;
  const testList = tests.data.results.data;
  const fwList = frameworks.data.results.data;

  res.json({
    source,
    organization: "Counter",
    monitoredBy: "Vanta",
    generatedAt: new Date().toISOString(),
    summary: {
      controlsTotal: controlList.length,
      controlsPassing: controlList.filter((c) => c.status === "passing").length,
      controlsFailing: controlList.filter(
        (c) => c.status === "failing" || c.status === "needs_attention",
      ).length,
      testsTotal: testList.length,
      testsPassing: testList.filter((t) => t.status === "PASSING").length,
      testsNeedingAttention: testList.filter(
        (t) => t.status === "NEEDS_ATTENTION" || t.status === "FAILING",
      ).length,
    },
    frameworks: fwList,
    integrations: integrations.data.results.data,
    recentEvents: testList
      .slice()
      .sort((a, b) => (a.lastRunAt < b.lastRunAt ? 1 : -1))
      .slice(0, 6)
      .map((t) => ({
        timestamp: t.lastRunAt,
        label: `${t.name} — ${t.status.toLowerCase().replace("_", " ")}`,
        severity: t.status === "PASSING" ? "info" : "warn",
      })),
  });
});

export default router;
