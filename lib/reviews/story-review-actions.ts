"use server";

import { revalidatePath } from "next/cache";
import {
  deleteMyStoryReview,
  getStoryReviews,
  markReviewHelpful,
  upsertStoryReview
} from "@/lib/reviews/story-reviews";
import type { StoryReviewInput, StoryReviewSort } from "@/types/story-review";

export async function upsertStoryReviewAction(
  storyId: string,
  input: StoryReviewInput,
  returnTo?: string
) {
  const result = await upsertStoryReview(storyId, input);
  if (result.ok && returnTo) {
    revalidatePath(returnTo);
  }
  return result;
}

export async function deleteMyStoryReviewAction(reviewId: string, returnTo?: string) {
  const result = await deleteMyStoryReview(reviewId);
  if (result.ok && returnTo) {
    revalidatePath(returnTo);
  }
  return result;
}

export async function markReviewHelpfulAction(reviewId: string) {
  return markReviewHelpful(reviewId);
}

export async function loadStoryReviewsPageAction(input: {
  storyId: string;
  page: number;
  sort: StoryReviewSort;
  viewerProfileId?: string | null;
}) {
  return getStoryReviews(input.storyId, {
    page: input.page,
    sort: input.sort,
    viewerProfileId: input.viewerProfileId
  });
}
