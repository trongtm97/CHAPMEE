"use client";

import { StoryReviewForm } from "@/components/story/reviews/StoryReviewForm";
import { StoryReviewList } from "@/components/story/reviews/StoryReviewList";
import { StoryReviewSummary } from "@/components/story/reviews/StoryReviewSummary";
import type {
  StoryReviewStatsView,
  StoryReviewView,
  StoryReviewsPageResult
} from "@/types/story-review";

type StoryReviewsTabProps = {
  storyId: string;
  returnTo: string;
  loggedIn: boolean;
  isAuthor: boolean;
  stats: StoryReviewStatsView;
  myReview: StoryReviewView | null;
  initialReviewsPage: StoryReviewsPageResult;
  viewerProfileId: string | null;
};

export function StoryReviewsTab({
  initialReviewsPage,
  isAuthor,
  loggedIn,
  myReview,
  returnTo,
  stats,
  storyId,
  viewerProfileId
}: StoryReviewsTabProps) {
  return (
    <div className="space-y-5">
      <StoryReviewSummary stats={stats} />
      <StoryReviewForm
        isAuthor={isAuthor}
        loggedIn={loggedIn}
        myReview={myReview}
        returnTo={returnTo}
        storyId={storyId}
      />
      <StoryReviewList
        initialPage={initialReviewsPage}
        loggedIn={loggedIn}
        returnTo={returnTo}
        storyId={storyId}
        viewerProfileId={viewerProfileId}
      />
    </div>
  );
}
