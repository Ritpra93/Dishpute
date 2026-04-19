// Visual content fixtures for the W1 mock portals (UberEats + Grubhub).
// Hand-tuned for House of Curry. Used by mock-portal-* /menu, /hours, /reviews
// pages — the W4 ops UIs read from a different source.

export const MENU_ITEMS = [
  { id: "m1", name: "Masala Dosa", category: "Mains", priceCents: 1400, available: true },
  { id: "m2", name: "Mysore Masala Dosa", category: "Mains", priceCents: 1600, available: true },
  { id: "m3", name: "Chicken Biryani", category: "Mains", priceCents: 1800, available: true },
  { id: "m4", name: "Hyderabadi Biryani", category: "Mains", priceCents: 1900, available: true },
  { id: "m5", name: "Paneer Butter Masala", category: "Mains", priceCents: 1600, available: true },
  { id: "m6", name: "Idli Sambar (4 pcs)", category: "Breakfast", priceCents: 1100, available: false },
  { id: "m7", name: "Medu Vada (4 pcs)", category: "Breakfast", priceCents: 900, available: true },
  { id: "m8", name: "Onion Uttapam", category: "Mains", priceCents: 1400, available: true },
  { id: "m9", name: "Garlic Naan", category: "Sides", priceCents: 500, available: true },
  { id: "m10", name: "Mango Lassi", category: "Drinks", priceCents: 500, available: true },
  { id: "m11", name: "Masala Chai", category: "Drinks", priceCents: 400, available: true },
  { id: "m12", name: "Gulab Jamun (2 pcs)", category: "Desserts", priceCents: 600, available: true },
] as const;

export const HOURS_GRID = [
  { day: "Monday",    open: "11:00", close: "22:00" },
  { day: "Tuesday",   open: "11:00", close: "22:00" },
  { day: "Wednesday", open: "11:00", close: "22:00" },
  { day: "Thursday",  open: "11:00", close: "23:00" },
  { day: "Friday",    open: "11:00", close: "23:30" },
  { day: "Saturday",  open: "10:00", close: "23:30" },
  { day: "Sunday",    open: "10:00", close: "22:00" },
] as const;

export const REVIEWS = [
  {
    id: "r1",
    rating: 5,
    author: "Anita P.",
    text: "Best dosa in the Twin Cities. The sambar is exactly like home.",
    daysAgo: 1,
  },
  {
    id: "r2",
    rating: 4,
    author: "Marcus L.",
    text: "Biryani was great, naan was a touch dry. Would order again.",
    daysAgo: 2,
  },
  {
    id: "r3",
    rating: 2,
    author: "Anonymous",
    text: "Delivery took 90 minutes and food was cold.",
    daysAgo: 3,
  },
  {
    id: "r4",
    rating: 5,
    author: "Priya R.",
    text: "Mango lassi → perfect. House of Curry never misses.",
    daysAgo: 4,
  },
  {
    id: "r5",
    rating: 3,
    author: "Daniel K.",
    text: "Order was missing items but the dosa I did get was good.",
    daysAgo: 5,
  },
] as const;
