"use client";

import { useState } from "react";
import { FieldLabel, OpsShell, type Platform } from "@/components/ops/ops-shell";
import { REVIEWS } from "@/lib/fixtures/mock-portal-content";

const INPUT =
  "rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-money focus:outline-none focus:ring-1 focus:ring-money";

export default function OpsReviewsPage() {
  const first = REVIEWS[0];
  const [reviewId, setReviewId] = useState<string>(first?.id ?? "");
  const [platform, setPlatform] = useState<Platform>("doordash");
  const [reply, setReply] = useState(
    "Thanks so much for the kind words — we'll see you next time!"
  );

  const review = REVIEWS.find((r) => r.id === reviewId);

  return (
    <OpsShell
      endpoint="/api/ops/reviews"
      description="Reply to a review on the chosen platform. Counter signs in, finds the review, and posts the response."
      buildBody={() => ({ reviewId, platform, reply })}
      submitLabel="Post reply"
      canSubmit={reply.trim().length >= 10}
    >
      <FieldLabel label="Review">
        <select
          className={INPUT}
          value={reviewId}
          onChange={(e) => setReviewId(e.target.value)}
        >
          {REVIEWS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.author} · {"★".repeat(r.rating)} · {r.text.slice(0, 40)}…
            </option>
          ))}
        </select>
      </FieldLabel>

      {review && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-foreground">
            {review.author} · {"★".repeat(review.rating)}
          </div>
          <p className="mt-1 italic">&ldquo;{review.text}&rdquo;</p>
        </div>
      )}

      <FieldLabel label="Platform">
        <select
          className={INPUT}
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
        >
          <option value="doordash">DoorDash</option>
          <option value="ubereats">Uber Eats</option>
          <option value="grubhub">Grubhub</option>
        </select>
      </FieldLabel>

      <FieldLabel label="Reply" hint={`${reply.length}/1000`}>
        <textarea
          rows={4}
          className={INPUT}
          value={reply}
          onChange={(e) => setReply(e.target.value.slice(0, 1000))}
        />
      </FieldLabel>
    </OpsShell>
  );
}
