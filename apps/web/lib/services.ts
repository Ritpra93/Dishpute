/**
 * Factory helpers that pick the real implementation when API keys are present
 * and fall back to mocks for offline dev/demo rehearsal.
 *
 * Scraper: real when TINYFISH_API_KEY is set and SCRAPER_MODE !== "cache"
 * Classifier: real when ANTHROPIC_API_KEY is set
 */

import { createScraper, createMockScraper } from "@counter/scraper";
import { createClassifier, createMockClassifier } from "@counter/classifier";

export function getScraper() {
  const key = process.env["TINYFISH_API_KEY"];
  if (key && process.env["SCRAPER_MODE"] !== "cache") {
    return createScraper({ tinyFishApiKey: key });
  }
  if (process.env["SCRAPER_MODE"] !== "cache") {
    console.warn("[services] TINYFISH_API_KEY not set — using mock scraper");
  }
  return createMockScraper({ latencyMs: 800 });
}

export function getClassifier() {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (key) {
    return createClassifier({ anthropicApiKey: key });
  }
  console.warn("[services] ANTHROPIC_API_KEY not set — using mock classifier");
  return createMockClassifier({ latencyMs: 0 });
}
