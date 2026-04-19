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

  // express-rate-limit (and any future reverse-proxy logic) needs accurate
  // req.ip when running behind ngrok / a load balancer. Trust one hop.
  app.set("trust proxy", 1);

  // Restrict CORS to the dashboard origin. WEB_ORIGIN comma-separated supports
  // localhost during dev + the deployed dashboard in prod. Falling back to
  // localhost:3000 keeps `pnpm dev:web` working out of the box; production
  // deployments MUST set WEB_ORIGIN explicitly.
  const webOrigins = (process.env["WEB_ORIGIN"] ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  app.use(cors({ origin: webOrigins, credentials: false }));

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
    // ngrokPublicUrl is useful for debugging in dev (lets an engineer curl
    // /health and see which tunnel the agent is actually pointed at) but in
    // production we omit it so an unauthenticated /health response can't be
    // used to enumerate the tunnel / internal DNS we're exposing.
    if (process.env.NODE_ENV === "production") {
      res.json({ status: "ok" });
      return;
    }
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
