import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // One fixture DB per file; individual tests reset tables as needed.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    // Allow tests to call POST /api/scan with { reset: true }. In production this
    // gate is OFF — see apps/web/app/api/scan/route.ts.
    env: {
      ALLOW_DESTRUCTIVE_RESET: "1",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
