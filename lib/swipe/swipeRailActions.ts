"use server";

import { redirect } from "next/navigation";
import { followCreatorAction } from "@/lib/actions/followCreator";
import { saveStoryAction } from "@/lib/actions/saveStory";
import { toggleEpisodeLikeAction } from "@/lib/actions/toggleEpisodeLike";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { createClient } from "@/lib/supabase/server";

type SwipeRailEventInput = {
  creatorId?: string | null;
  episodeId: string;
  liked?: boolean;
  following?: boolean;
  itemIndex: number;
  saved?: boolean;
  storyId: string;
  storySlug: string;
};

async function requireSwipeUser(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
}

export async function trackSwipeCommentAndRedirect({
  episodeId,
  itemIndex,
  storyId,
  storySlug
}: SwipeRailEventInput) {
  await requireSwipeUser(`/stories/${storySlug}#comments`);

  await trackServerEvent({
    eventName: analyticsEvents.feedComment,
    metadata: {
      episode_id: episodeId,
      item_index: itemIndex,
      story_id: storyId
    },
    targetId: episodeId,
    targetType: "episode"
  });

  redirect(`/stories/${storySlug}#comments`);
}

export async function toggleSwipeEpisodeLike({
  episodeId,
  creatorId,
  storyId,
  liked
}: SwipeRailEventInput) {
  await toggleEpisodeLikeAction({
    episodeId,
    creatorId: creatorId ?? null,
    liked: Boolean(liked),
    storyId,
    returnTo: "/swipe"
  });
}

export async function saveSwipeStory({
  creatorId,
  episodeId,
  itemIndex,
  saved,
  storyId,
  storySlug
}: SwipeRailEventInput) {
  await trackServerEvent({
    eventName: analyticsEvents.feedSave,
    metadata: {
      episode_id: episodeId,
      item_index: itemIndex,
      story_id: storyId
    },
    targetId: storyId,
    targetType: "story"
  });

  await saveStoryAction({
    creatorId: creatorId ?? null,
    returnTo: "/swipe",
    saved: Boolean(saved),
    storyId,
    storySlug
  });
}

export async function followSwipeCreator({
  creatorId,
  episodeId,
  following,
  itemIndex,
  storyId,
  storySlug
}: SwipeRailEventInput) {
  if (!creatorId) {
    return;
  }

  await trackServerEvent({
    eventName: analyticsEvents.feedFollow,
    metadata: {
      creator_id: creatorId,
      episode_id: episodeId,
      item_index: itemIndex,
      story_id: storyId
    },
    targetId: creatorId,
    targetType: "creator"
  });

  await followCreatorAction({
    creatorId,
    following: Boolean(following),
    returnTo: "/swipe",
    storySlug
  });
}
