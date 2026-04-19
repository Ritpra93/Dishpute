import { REVIEWS } from "@/lib/fixtures/mock-portal-content";

export default function GrubhubReviewsPage() {
  const avg =
    REVIEWS.reduce((s, r) => s + r.rating, 0) / Math.max(REVIEWS.length, 1);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Diner reviews</h1>
          <p className="mt-1 text-sm text-[#1A1A1A]/70">
            {REVIEWS.length} reviews · avg {avg.toFixed(1)}
          </p>
        </div>
      </div>
      <ul id="reviews-list" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {REVIEWS.map((r) => (
          <li
            key={r.id}
            data-review-id={r.id}
            data-rating={r.rating}
            className="rounded-2xl border border-[#F63440]/20 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[#1A1A1A]/60">
              <span className="font-semibold text-[#F63440]">{r.author}</span>
              <span>{r.daysAgo}d ago</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-[#F63440]">
              {"★".repeat(r.rating)}
              <span className="text-[#F63440]/20">{"☆".repeat(5 - r.rating)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#1A1A1A]/70">{r.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
