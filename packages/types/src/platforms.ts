/**
 * Platform constants shared across the mock-portal trio (W1) and any
 * scraper/classifier consumer that needs to map a Platform → URL.
 *
 * Owned by: packages/types (frozen — additions only, no renames).
 * Consumed by: apps/web/app/mock-portal-*, packages/scraper, packages/classifier.
 */

import type { Platform } from "./index";

export const SUPPORTED_PLATFORMS: readonly Platform[] = [
  "doordash",
  "ubereats",
  "grubhub",
] as const;

/**
 * In-app routes for each mock portal. The DoorDash one is the original
 * `/mock-portal/disputes` (kept for backwards compatibility with Worker 1's
 * fixtures); UberEats + Grubhub are the W1 additions.
 */
export const PLATFORM_URLS: Record<Platform, {
  base: string;
  disputes: string;
  menu: string;
  hours: string;
  reviews: string;
}> = {
  doordash: {
    base: "/mock-portal",
    disputes: "/mock-portal/disputes",
    menu: "/mock-portal/menu",
    hours: "/mock-portal/orders",
    reviews: "/mock-portal/analytics",
  },
  ubereats: {
    base: "/mock-portal-ubereats",
    disputes: "/mock-portal-ubereats/disputes",
    menu: "/mock-portal-ubereats/menu",
    hours: "/mock-portal-ubereats/hours",
    reviews: "/mock-portal-ubereats/reviews",
  },
  grubhub: {
    base: "/mock-portal-grubhub",
    disputes: "/mock-portal-grubhub/disputes",
    menu: "/mock-portal-grubhub/menu",
    hours: "/mock-portal-grubhub/hours",
    reviews: "/mock-portal-grubhub/reviews",
  },
} as const;

/**
 * The DOM-attribute contract every dispute portal exposes.
 * Worker 1 keys against these. If you change a name, every portal page
 * needs the same change in the same commit.
 */
export const DISPUTE_DOM_CONTRACT = {
  tableId: "disputes-table",
  rowAttrs: {
    disputeId: "data-dispute-id",
    orderId: "data-order-id",
    chargeCents: "data-charge-cents",
    chargeType: "data-charge-type",
    items: "data-items",
    orderTs: "data-order-ts",
    chargeTs: "data-charge-ts",
    portalUrl: "data-portal-url",
    merchantId: "data-merchant-id",
  },
  customerCommentClass: "customer-comment",
  actionButtonText: "Dispute charge",
} as const;
