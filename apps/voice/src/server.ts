import express from "express";
import cors from "cors";
import path from "path";
import { config } from "./config";
import callsRouter from "./routes/calls";
import toolsRouter from "./routes/tools";
import webhooksRouter from "./routes/webhooks";
import vantaRouter from "./routes/vanta";

const app = express();

app.use(cors());
app.use(express.json());

// Serve the backup-call page + audio from apps/voice/public.
// Available at {NGROK_URL}/backup-call.html during the demo.
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", ngrokPublicUrl: config.ngrokPublicUrl || "NOT SET" });
});

app.use(callsRouter);
app.use(toolsRouter);
app.use(webhooksRouter);
app.use(vantaRouter);

app.listen(config.port, () => {
  console.log(`[voice] Express listening on port ${config.port}`);
  if (!config.ngrokPublicUrl) {
    console.warn("[voice] NGROK_PUBLIC_URL not set — set it in .env.local");
  } else {
    console.log(`[voice] Public URL: ${config.ngrokPublicUrl}`);
  }
});
