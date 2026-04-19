// Pass-through: mock scraper is now @counter/scraper.
// Also re-exports the canonical demo ID lists used by API routes + seed.
export {
  createMockScraper,
  createScraper,
  DEMO_APPROVED_IDS,
  DEMO_DENIED_IDS,
  DEMO_OUTCOMES_SUMMARY,
} from "@counter/scraper";
