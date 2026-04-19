/**
 * Canonical menu / review shapes consumed by W4 (`/ops/menu`, `/ops/reviews`).
 * Cross-platform — the future C8/C10 cross-platform menu cleanup feature
 * keys against these.
 */

import type { Platform } from "./index";

export type MenuItemAvailability = "available" | "86d" | "limited";

export interface CanonicalMenuItem {
  /** Counter-internal id, stable across platforms. */
  id: string;
  name: string;
  category: string;
  priceCents: number;
  description?: string;
  imageUrl?: string;
  availability: MenuItemAvailability;
  /** Per-platform availability overrides — e.g. 86'd on UberEats only. */
  platformOverrides?: Partial<Record<Platform, { availability?: MenuItemAvailability; priceCents?: number }>>;
}

export type ReviewSentiment = "positive" | "neutral" | "negative";

export interface Review {
  id: string;
  platform: Platform;
  authorName: string;
  rating: number; // 1-5
  text: string;
  createdAt: string;
  sentiment: ReviewSentiment;
  /** Counter-suggested response, or null if the operator hasn't drafted one. */
  draftedReply?: string | null;
  itemMentions?: string[];
}
