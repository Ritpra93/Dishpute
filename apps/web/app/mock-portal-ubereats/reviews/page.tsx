import { REVIEWS } from "@/lib/fixtures/mock-portal-content";

export default function UberEatsReviewsPage() {
  const avg =
    REVIEWS.reduce((s, r) => s + r.rating, 0) / Math.max(REVIEWS.length, 1);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer reviews</h1>
          <p className="mt-1 text-sm text-black/60">
            {REVIEWS.length} reviews · avg {avg.toFixed(1)}
          </p>
        </div>
      </div>
      <ul id="reviews-list" className="space-y-3">
        {REVIEWS.map((r) => (
          <li
            key={r.id}
            data-review-id={r.id}
            data-rating={r.rating}
            className="border border-black bg-white p-4"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-black/60">
              <span>{r.author}</span>
              <span>{r.daysAgo}d ago</span>
            </div>
            <div className="mt-1 text-sm font-semibold">
              {"★".repeat(r.rating)}
              <span className="text-black/30">{"☆".repeat(5 - r.rating)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-black/70">{r.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
