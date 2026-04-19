import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: [".next/**", "node_modules/**", "dist/**", "counter.db*"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  // react-hooks rules only apply to client-side React files. Test helpers,
  // API routes, and server-side .ts files have utility functions whose names
  // happen to start with "use" (e.g. useTempDb, useTinyfish) — those are not
  // React hooks. Scope the plugin to component / app-router directories and
  // the handful of client-only .ts hooks (lib/format.ts).
  {
    files: [
      "app/**/*.tsx",
      "components/**/*.tsx",
      "lib/format.ts",
      "hooks/**/*.{ts,tsx}",
    ],
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
