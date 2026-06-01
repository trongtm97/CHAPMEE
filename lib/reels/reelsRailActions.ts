"use server";

import { redirect } from "next/navigation";
import { followCreatorAction } from "@/lib/actions/followCreator";
import { saveStoryAction } from "@/lib/actions/saveStory";
import { toggleEpisodeLikeAction } from "@/lib/actions/toggleEpisodeLike";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import { createClient } from "@/lib/supabase/server";
import { getStoryUrl } from "@/lib/urls/paths";

type ReelsRailEventInput = {
  creatorId?: string | null;
  episodeId: string;
  liked?: boolean;
  following?: boolean;
  itemIndex: number;
  saved?: boolean;
  storyId: string;
  storySlug: string;
  storyPublicCode: string;
};

async function requireReelsUser(nextPath: string) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
}

export async function trackReelsCommentAndRedirect({
  episodeId,
  itemIndex,
  storyId,
  storySlug,
  storyPublicCode
}: ReelsRailEventInput) {
  const storyHref = getStoryUrl({ slug: storySlug, public_code: storyPublicCode });
  await requireReelsUser(`${storyHref}#comments`);

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

  redirect(`${storyHref}#comments`);
}

export async function toggleReelsEpisodeLike({
  episodeId,
  creatorId,
  storyId,
  liked
}: ReelsRailEventInput) {
  await toggleEpisodeLikeAction({
    episodeId,
    creatorId: creatorId ?? null,
    liked: Boolean(liked),
    storyId,
    returnTo: REELS_PUBLIC_PATH
  });
}

export async function saveReelsStory({
  creatorId,
  episodeId,
  itemIndex,
  saved,
  storyId,
  storySlug
}: ReelsRailEventInput) {
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
    returnTo: REELS_PUBLIC_PATH,
    saved: Boolean(saved),
    sourceSurface: "reels",
    trackingSurface: "reels",
    storyId,
    storySlug
  });
}

export async function followReelsCreator({
  creatorId,
  episodeId,
  following,
  itemIndex,
  storyId,
  storySlug
}: ReelsRailEventInput) {
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
    returnTo: REELS_PUBLIC_PATH,
    storySlug
  });
}
