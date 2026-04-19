import path from "path";
import { promises as fs } from "fs";

// We import the MCP SDK lazily so that fixture-only mode doesn't pay the
// startup cost of resolving the ESM module under tsx, and so a missing peer
// dep can never crash the voice server (Vanta is non-critical for the demo).
type McpClient = {
  connect: (transport: unknown) => Promise<void>;
  callTool: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<{
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
    structuredContent?: unknown;
  }>;
  close: () => Promise<void>;
};

/**
 * Officially supported tool names exposed by @vantasdk/vanta-mcp-server.
 * Source: https://github.com/VantaInc/vanta-mcp-server (README §Features).
 */
export type VantaToolName =
  | "frameworks"
  | "controls"
  | "list_control_tests"
  | "list_control_documents"
  | "documents"
  | "document_resources"
  | "list_framework_controls"
  | "integrations"
  | "integration_resources"
  | "tests"
  | "list_test_entities"
  | "people"
  | "risks"
  | "vulnerabilities";

export interface VantaToolResult<T = unknown> {
  /** "live" when the response came from the real Vanta MCP server, "fixture" otherwise. */
  source: "live" | "fixture";
  /** When source === "fixture", explains why we fell back. */
  fallbackReason?:
    | "no_credentials"
    | "connect_failed"
    | "connect_timeout"
    | "tool_error"
    | "sdk_unavailable";
  data: T;
}

const FIXTURE_DIR = path.resolve(__dirname, "..", "..", "__fixtures__", "vanta");

const FIXTURE_FILE: Partial<Record<VantaToolName, string>> = {
  frameworks: "frameworks.json",
  controls: "controls.json",
  tests: "tests.json",
  integrations: "integrations.json",
  documents: "documents.json",
};

class VantaMcpClient {
  private client: McpClient | null = null;
  private connectAttempted = false;
  private connectPromise: Promise<McpClient | null> | null = null;
  /** Cap on how long we'll wait for a cold MCP connect before falling back. */
  private static readonly CONNECT_TIMEOUT_MS = 500;

  /**
   * Resolve the OAuth credentials path. When unset we never even attempt to
   * spawn the MCP server — we go straight to fixtures. This keeps the demo
   * fast and avoids spurious child-process noise.
   */
  private get credentialPath(): string | undefined {
    return process.env["VANTA_ENV_FILE"];
  }

  private async connect(): Promise<McpClient | null> {
    if (this.client) return this.client;
    if (this.connectAttempted) return null;
    if (this.connectPromise) return this.connectPromise;

    this.connectAttempted = true;
    this.connectPromise = this.attemptConnect();
    return this.connectPromise;
  }

  private async attemptConnect(): Promise<McpClient | null> {
    const envFile = this.credentialPath;
    if (!envFile) return null;

    try {
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const { StdioClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/stdio.js"
      );

      const transport = new StdioClientTransport({
        command: "npx",
        args: ["-y", "@vantasdk/vanta-mcp-server"],
        env: { ...process.env, VANTA_ENV_FILE: envFile } as Record<string, string>,
      });

      const client = new Client({ name: "counter-voice", version: "0.1.0" }) as unknown as McpClient;

      const connectWithTimeout = Promise.race([
        client.connect(transport).then(() => "ok" as const),
        new Promise<"timeout">((resolve) =>
          setTimeout(() => resolve("timeout"), VantaMcpClient.CONNECT_TIMEOUT_MS),
        ),
      ]);

      const outcome = await connectWithTimeout;
      if (outcome === "timeout") {
        console.warn(
          `[vanta-mcp] connect exceeded ${VantaMcpClient.CONNECT_TIMEOUT_MS}ms; falling back to fixtures`,
        );
        client.close().catch(() => {});
        return null;
      }

      this.client = client;
      console.log("[vanta-mcp] connected to live tenant via @vantasdk/vanta-mcp-server");
      return client;
    } catch (err) {
      console.warn(
        "[vanta-mcp] failed to start MCP client; falling back to fixtures",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  }

  private async loadFixture<T>(tool: VantaToolName): Promise<T> {
    const filename = FIXTURE_FILE[tool];
    if (!filename) {
      throw new Error(`No fixture available for Vanta tool "${tool}"`);
    }
    const buf = await fs.readFile(path.join(FIXTURE_DIR, filename), "utf-8");
    return JSON.parse(buf) as T;
  }

  async callTool<T = unknown>(
    tool: VantaToolName,
    args: Record<string, unknown> = {},
  ): Promise<VantaToolResult<T>> {
    const client = await this.connect();

    if (!client) {
      const reason: VantaToolResult["fallbackReason"] = this.credentialPath
        ? "connect_failed"
        : "no_credentials";
      const data = await this.loadFixture<T>(tool);
      console.log(`[vanta-mcp] fixture (reason: ${reason}, tool: ${tool})`);
      return { source: "fixture", fallbackReason: reason, data };
    }

    try {
      const res = await client.callTool({ name: tool, arguments: args });
      if (res.isError) throw new Error("Vanta MCP returned isError=true");

      // Most Vanta tools return JSON in res.content[0].text per MCP spec.
      const text = res.content?.find((c) => c.type === "text")?.text;
      const data = (res.structuredContent ?? (text ? JSON.parse(text) : null)) as T;
      console.log(`[vanta-mcp] live (tool: ${tool})`);
      return { source: "live", data };
    } catch (err) {
      console.warn(
        `[vanta-mcp] tool "${tool}" failed; falling back to fixture`,
        err instanceof Error ? err.message : err,
      );
      const data = await this.loadFixture<T>(tool);
      return { source: "fixture", fallbackReason: "tool_error", data };
    }
  }
}

let singleton: VantaMcpClient | null = null;

export function getVantaClient(): VantaMcpClient {
  if (!singleton) singleton = new VantaMcpClient();
  return singleton;
}

// Vanta's API envelope: every list response is { results: { data: [...], pageInfo: {...} } }.
export interface VantaEnvelope<T> {
  results: {
    data: T[];
    pageInfo: { endCursor: string | null; hasNextPage: boolean };
  };
}

export interface VantaFramework {
  id: string;
  name: string;
  productFamily: string;
  completionPercent: number;
  status: "in_progress" | "monitored" | "certified";
  controlsCount: number;
  controlsCompletedCount: number;
  nextAuditDate: string | null;
  createdAt: string;
}

export interface VantaControl {
  id: string;
  name: string;
  description: string;
  category: string;
  status: "passing" | "failing" | "needs_attention" | "not_applicable";
  frameworkIds: string[];
  ownerEmail: string;
  lastEvaluatedAt: string;
}

export interface VantaTest {
  id: string;
  name: string;
  status: "PASSING" | "FAILING" | "NEEDS_ATTENTION" | "NOT_APPLICABLE";
  category: string;
  integrationFilter: string;
  frameworkFilter: string;
  controlIds: string[];
  lastRunAt: string;
}

export interface VantaIntegration {
  id: string;
  displayName: string;
  applicationUrl: string;
  connectionStatus: "CONNECTED" | "CONFIGURED" | "DISCONNECTED";
  resourceKinds: string[];
  lastSyncAt: string;
}

export interface VantaDocument {
  id: string;
  name: string;
  documentType: string;
  status: "approved" | "in_review" | "draft";
  controlIds: string[];
  lastReviewedAt: string;
  uploadedAt: string;
}
