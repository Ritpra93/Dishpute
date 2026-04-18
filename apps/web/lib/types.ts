/**
 * Pass-through to the workspace contract packages.
 *
 * All shared domain types, constants, EnrichedDispute, and DashboardStats
 * live in @counter/types. Scraper and Classifier interfaces live in their
 * respective packages. Apps should import from here (or directly from the
 * workspace packages) — never inline a duplicate type.
 */

export * from "@counter/types";
export type { Scraper } from "@counter/scraper";
export type { Classifier } from "@counter/classifier";
