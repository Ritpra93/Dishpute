/**
 * Vanta pre-flight gate for autonomous agent actions.
 *
 * Before the dispute agent takes any action that affects the merchant or a
 * platform support rep (today: voice escalation), we ask Vanta whether our
 * compliance posture is healthy. If any "critical" automated test is in
 * NEEDS_ATTENTION or FAILING, we block the action and surface the failing
 * tests to the operator.
 *
 * Implementation: this hits apps/voice's /api/vanta/tests endpoint, which in
 * turn proxies to the official Vanta MCP server when a tenant is configured,
 * or serves bundled fixtures otherwise. Either way the response shape is
 * identical, so this gate behaves consistently across environments.
 *
 * This is the AgentSafe pattern (per AWS AI Agents Hackathon 2025): treat
 * compliance posture as a load-bearing precondition for autonomous action,
 * not a back-office concern.
 */

const CRITICAL_CATEGORIES = ["data_security", "access_control", "ai_governance"] as const;

interface VantaTest {
  id: string;
  name: string;
  status: "PASSING" | "FAILING" | "NEEDS_ATTENTION" | "NOT_APPLICABLE";
  category: string;
  integrationFilter: string;
  frameworkFilter: string;
}

interface VantaToolResponse {
  source: "live" | "fixture";
  fallbackReason?: string;
  data: { results: { data: VantaTest[] } };
}

export interface VantaGateDecision {
  allowed: boolean;
  source: "live" | "fixture" | "unreachable";
  controlsChecked: number;
  failingCritical: Array<{ id: string; name: string; category: string }>;
  /** Set when allowed=false. */
  blockedReason?: string;
}

const VANTA_TESTS_URL =
  process.env["VANTA_TESTS_URL"] ?? "http://localhost:4000/api/vanta/tests";
const GATE_TIMEOUT_MS = 1500;

export async function preflight(): Promise<VantaGateDecision> {
  // Allow tests / offline rehearsal to skip the network entirely.
  if (process.env["VANTA_GATE_BYPASS"] === "1") {
    return {
      allowed: true,
      source: "fixture",
      controlsChecked: 0,
      failingCritical: [],
    };
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), GATE_TIMEOUT_MS);
    const res = await fetch(`${VANTA_TESTS_URL}?frameworkFilter=soc2`, {
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`vanta tests upstream ${res.status}`);
    const payload = (await res.json()) as VantaToolResponse;
    const tests = payload.data.results.data;

    const failingCritical = tests
      .filter(
        (t) =>
          (t.status === "FAILING" || t.status === "NEEDS_ATTENTION") &&
          (CRITICAL_CATEGORIES as readonly string[]).includes(t.category),
      )
      .map((t) => ({ id: t.id, name: t.name, category: t.category }));

    return {
      allowed: failingCritical.length === 0,
      source: payload.source,
      controlsChecked: tests.length,
      failingCritical,
      ...(failingCritical.length > 0
        ? {
            blockedReason: `Vanta pre-flight blocked: ${failingCritical.length} critical test(s) need attention.`,
          }
        : {}),
    };
  } catch (err) {
    // FAIL-OPEN policy: a Vanta service outage must not freeze the dashboard
    // mid-demo. We log loudly and proceed; the audit log records source =
    // "unreachable" so the operator can later confirm what happened.
    console.warn(
      "[vanta-gate] preflight check unreachable, fail-open:",
      err instanceof Error ? err.message : err,
    );
    return {
      allowed: true,
      source: "unreachable",
      controlsChecked: 0,
      failingCritical: [],
    };
  }
}
