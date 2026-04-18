import cors from "cors";
import express from "express";
import { callsRouter } from "./routes/calls.js";

const PORT = Number(process.env.PORT ?? 4000);

export function createApp() {
  const app = express();

  app.use(cors());

  // JSON parser mounted per-router below (NOT globally) so the ElevenLabs
  // post-call webhook route can use express.raw() for signature verification.
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "@counter/voice", time: new Date().toISOString() });
  });

  app.use(callsRouter);

  return app;
}

// Only start the server when invoked directly (not when imported by tests).
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("server.ts");

if (isDirectRun) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`[@counter/voice] listening on http://localhost:${PORT}`);
  });
}
