import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { config } from "./config";
import callsRouter from "./routes/calls";
import toolsRouter from "./routes/tools";
import webhooksRouter from "./routes/webhooks";
import vantaRouter from "./routes/vanta";

/** Build the Express app. Exported so tests can mount it without starting a server. */
export function createApp(): Express {
  const app = express();

  app.use(cors());

  // CRITICAL: mount the webhooks router BEFORE express.json() so the route's
  // own raw-body middleware can read the exact bytes for HMAC signature
  // verification. If we put express.json() first, body is consumed and the
  // raw parser sees an empty stream — signature check silently fails.
  app.use(webhooksRouter);

  // Everything else accepts JSON bodies.
  app.use(express.json());

  // Serve the backup-call page + audio from apps/voice/public.
  // Available at {NGROK_URL}/backup-call.html during the demo.
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      ngrokPublicUrl: config.ngrokPublicUrl || "NOT SET",
    });
  });

  app.use(callsRouter);
  app.use(toolsRouter);
  app.use(vantaRouter);

  return app;
}

// Only start the HTTP listener when this file is the entrypoint (tsx/node).
// Tests import createApp directly and manage lifecycle themselves.
if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`[voice] Express listening on port ${config.port}`);
    if (!config.ngrokPublicUrl) {
      console.warn("[voice] NGROK_PUBLIC_URL not set — set it in .env.local");
    } else {
      console.log(`[voice] Public URL: ${config.ngrokPublicUrl}`);
    }
  });
}
