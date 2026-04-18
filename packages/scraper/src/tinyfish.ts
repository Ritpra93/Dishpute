// Verified against docs/VERIFIED_APIS.md — TinyFish section.
// Endpoint: POST https://agent.tinyfish.ai/v1/automation/run-sse
// Auth: X-API-Key header (NOT Authorization: Bearer)
// Terminal event: type === "COMPLETE", status === "COMPLETED", data in `result`
// NOTE: live API uses `result`, NOT `resultJson` (docs are wrong — verified 2026-04-18)
// No typed SDK — plain fetch + SSE.

type TinyFishEvent = {
  type: string;
  status?: string;
  run_id?: string;
  streaming_url?: string;
  result?: unknown;
  message?: string;
};

export async function runTinyFish(params: {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: { enabled: boolean; country_code: string };
}): Promise<unknown> {
  const res = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
    method: "POST",
    headers: {
      "X-API-Key": process.env["TINYFISH_API_KEY"]!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    throw new Error(`TinyFish ${res.status}: ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const evt: TinyFishEvent = JSON.parse(line.slice(6)) as TinyFishEvent;

      if (evt.type === "COMPLETE" && evt.status === "COMPLETED") {
        // Trap: run can be COMPLETED but result.status === "failure" (goal failed)
        const result = evt.result as Record<string, unknown> | null | undefined;
        if (result && typeof result === "object" && result["status"] === "failure") {
          throw new Error(`TinyFish goal failed: ${JSON.stringify(result)}`);
        }
        return evt.result;
      }

      if (evt.status === "FAILED") {
        throw new Error(`TinyFish run failed: ${JSON.stringify(evt)}`);
      }
    }
  }

  throw new Error("TinyFish stream ended without COMPLETE event");
}
