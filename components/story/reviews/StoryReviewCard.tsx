"use client";

import { useTransition } from "react";
import { ReportButton } from "@/components/report/ReportButton";
import { AuthorNameLink } from "@/components/profile/AuthorNameLink";
import { formatReviewDate } from "@/components/story/reviews/review-ui-utils";
import { Button, Card } from "@/components/ui";
import { markReviewHelpfulAction } from "@/lib/reviews/story-review-actions";
import type { StoryReviewView } from "@/types/story-review";

type StoryReviewCardProps = {
  review: StoryReviewView;
  returnTo: string;
  loggedIn: boolean;
  onHelpfulChange?: (reviewId: string, helpfulCount: number, marked: boolean) => void;
};

export function StoryReviewCard({
  loggedIn,
  onHelpfulChange,
  returnTo,
  review
}: StoryReviewCardProps) {
  const [isPending, startTransition] = useTransition();

  const criteria = [
    { label: "Cốt truyện", value: review.plotScore },
    { label: "Nhân vật", value: review.characterScore },
    { label: "Văn phong", value: review.writingStyleScore },
    { label: "Bối cảnh", value: review.worldbuildingScore }
  ];

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            <AuthorNameLink
              name={review.reviewerDisplayName ?? "Độc giả ChapMee"}
              username={review.reviewerUsername}
            />
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {formatReviewDate(review.createdAt)}
            {review.updatedAt !== review.createdAt ? " · đã chỉnh sửa" : ""}
          </p>
        </div>
        <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm font-bold tabular-nums text-amber-100">
          {review.overallRating}/5
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {criteria.map((item) => (
          <span
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-300"
            key={item.label}
          >
            {item.label}: {item.value}/5
          </span>
        ))}
      </div>

      {review.title ? <p className="text-sm font-semibold text-zinc-100">{review.title}</p> : null}
      {review.body ? (
        <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">{review.body}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="min-h-9 px-3 text-xs"
          disabled={!loggedIn || isPending || review.isOwnReview}
          onClick={() => {
            startTransition(async () => {
              const result = await markReviewHelpfulAction(review.id);
              if (result.loginRequired) {
                window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
                return;
              }
              if (result.ok) {
                onHelpfulChange?.(review.id, result.helpfulCount, result.marked);
              }
            });
          }}
          type="button"
          variant={review.userMarkedHelpful ? "secondary" : "ghost"}
        >
          Hữu ích ({review.helpfulCount})
        </Button>
        {!review.isOwnReview ? (
          <ReportButton returnTo={returnTo} targetId={review.id} targetType="story_review" />
        ) : null}
      </div>
    </Card>
  );
}
