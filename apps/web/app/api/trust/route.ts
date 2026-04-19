import { NextResponse } from "next/server";
import { TRUST_FIXTURE, type TrustCenterPayload } from "@/lib/trust-fixture";

export const dynamic = "force-dynamic";

/**
 * Trust-center proxy.
 *
 * When TRUST_PROXY_URL is set (defaults to apps/voice's composite trust-center
 * endpoint at http://localhost:4000/api/vanta/trust-center) we forward there.
 * The voice service in turn talks to the official Vanta MCP server via
 * @vantasdk/vanta-mcp-server, falling back to its own fixtures when no
 * VANTA_ENV_FILE is configured. Either way, the response shape is identical.
 *
 * If the proxy fails (network error, voice service offline, malformed payload)
 * we return the local fixture so the dashboard never breaks. The `source`
 * field on the response tells the UI which path produced the data.
 */

const PROXY_URL =
  process.env["TRUST_PROXY_URL"] ?? "http://localhost:4000/api/vanta/trust-center";
const PROXY_TIMEOUT_MS = 1500;

export async function GET() {
  if (!process.env["TRUST_PROXY_URL"] && process.env["NODE_ENV"] === "test") {
    // Tests run without the voice service; serve the local fixture directly.
    return NextResponse.json(TRUST_FIXTURE);
  }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PROXY_TIMEOUT_MS);
    const upstream = await fetch(PROXY_URL, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(timer);

    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
    const payload = (await upstream.json()) as TrustCenterPayload;
    return NextResponse.json(payload);
  } catch (err) {
    console.warn(
      "[trust] proxy to voice service failed, serving local fixture:",
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(TRUST_FIXTURE);
  }
}
