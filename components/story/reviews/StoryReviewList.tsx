"use client";

import { useState, useTransition } from "react";
import { StoryReviewCard } from "@/components/story/reviews/StoryReviewCard";
import { Button } from "@/components/ui";
import { loadStoryReviewsPageAction } from "@/lib/reviews/story-review-actions";
import type { StoryReviewSort, StoryReviewsPageResult } from "@/types/story-review";

type StoryReviewListProps = {
  initialPage: StoryReviewsPageResult;
  storyId: string;
  returnTo: string;
  loggedIn: boolean;
  viewerProfileId: string | null;
};

const SORT_OPTIONS: Array<{ value: StoryReviewSort; label: string }> = [
  { value: "newest", label: "Mới nhất" },
  { value: "highest", label: "Cao nhất" },
  { value: "lowest", label: "Thấp nhất" },
  { value: "helpful", label: "Hữu ích" }
];

export function StoryReviewList({
  initialPage,
  loggedIn,
  returnTo,
  storyId,
  viewerProfileId
}: StoryReviewListProps) {
  const [pageData, setPageData] = useState(initialPage);
  const [isPending, startTransition] = useTransition();

  const loadPage = (page: number, sort: StoryReviewSort) => {
    startTransition(async () => {
      const next = await loadStoryReviewsPageAction({
        storyId,
        page,
        sort,
        viewerProfileId
      });
      setPageData(next);
    });
  };

  if (pageData.totalCount === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-zinc-100">Đánh giá từ độc giả</h3>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Sắp xếp
          <select
            className="rounded-lg border border-white/[0.08] bg-[#0b1016] px-2 py-1.5 text-xs text-zinc-200"
            disabled={isPending}
            onChange={(event) =>
              loadPage(1, event.target.value as StoryReviewSort)
            }
            value={pageData.sort}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-3">
        {pageData.reviews.map((review) => (
          <StoryReviewCard
            key={review.id}
            loggedIn={loggedIn}
            onHelpfulChange={(reviewId, helpfulCount, marked) => {
              setPageData((current) => ({
                ...current,
                reviews: current.reviews.map((item) =>
                  item.id === reviewId
                    ? { ...item, helpfulCount, userMarkedHelpful: marked }
                    : item
                )
              }));
            }}
            returnTo={returnTo}
            review={review}
          />
        ))}
      </div>

      {pageData.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <Button
            disabled={isPending || pageData.page <= 1}
            onClick={() => loadPage(pageData.page - 1, pageData.sort)}
            type="button"
            variant="ghost"
          >
            Trang trước
          </Button>
          <p className="text-xs tabular-nums text-zinc-500">
            {pageData.page}/{pageData.totalPages}
          </p>
          <Button
            disabled={isPending || pageData.page >= pageData.totalPages}
            onClick={() => loadPage(pageData.page + 1, pageData.sort)}
            type="button"
            variant="ghost"
          >
            Trang sau
          </Button>
        </div>
      ) : null}
    </section>
  );
}
