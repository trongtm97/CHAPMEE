import { analyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import { createClient } from "@/lib/supabase/server";

type ReelsEngagementAction = "follow" | "like" | "save" | "share";

type MutateReelsEngagementInput = {
  action: ReelsEngagementAction;
  creatorId?: string | null;
  episodeId: string;
  itemIndex: number;
  storyId: string;
};

type MutateReelsEngagementResult = {
  error: string | null;
  loginUrl: string | null;
  ok: boolean;
};

async function requireReelsUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      loginUrl: `/login?next=${REELS_PUBLIC_PATH}`,
      supabase: null,
      userId: null
    };
  }

  return {
    loginUrl: null,
    supabase,
    userId: user.id
  };
}

export async function mutateReelsEngagement(
  input: MutateReelsEngagementInput
): Promise<MutateReelsEngagementResult> {
  if (input.action === "share") {
    await trackServerEvent({
      eventName: analyticsEvents.feedShare,
      metadata: {
        episode_id: input.episodeId,
        item_index: input.itemIndex,
        story_id: input.storyId
      },
      targetId: input.storyId,
      targetType: "story"
    });

    return { error: null, loginUrl: null, ok: true };
  }

  const auth = await requireReelsUser();

  if (!auth.supabase || !auth.userId) {
    return { error: null, loginUrl: auth.loginUrl, ok: false };
  }

  const { supabase, userId } = auth;

  if (input.action === "like") {
    const { data: existing, error: existingError } = await supabase
      .from("reactions")
      .select("id")
      .eq("user_id", userId)
      .eq("target_id", input.episodeId)
      .eq("target_type", "episode")
      .eq("reaction_type", "like")
      .maybeSingle();

    if (existingError) {
      return { error: existingError.message, loginUrl: null, ok: false };
    }

    const { error } = existing
      ? await supabase
          .from("reactions")
          .delete()
          .eq("user_id", userId)
          .eq("target_id", input.episodeId)
          .eq("target_type", "episode")
          .eq("reaction_type", "like")
      : await supabase.from("reactions").upsert(
          {
            reaction_type: "like",
            target_id: input.episodeId,
            target_type: "episode",
            user_id: userId
          },
          { onConflict: "user_id,target_type,target_id,reaction_type" }
        );

    return { error: error?.message ?? null, loginUrl: null, ok: !error };
  }

  if (input.action === "save") {
    const { data: existing, error: existingError } = await supabase
      .from("bookshelf_items")
      .select("id")
      .eq("user_id", userId)
      .eq("story_id", input.storyId)
      .maybeSingle();

    if (existingError) {
      return { error: existingError.message, loginUrl: null, ok: false };
    }

    const { error } = existing
      ? await supabase
          .from("bookshelf_items")
          .delete()
          .eq("user_id", userId)
          .eq("story_id", input.storyId)
      : await supabase.from("bookshelf_items").upsert(
          {
            status: "saved",
            story_id: input.storyId,
            user_id: userId
          },
          { onConflict: "user_id,story_id" }
        );

    if (error) {
      return { error: error.message, loginUrl: null, ok: false };
    }

    await trackServerEvent({
      eventName: analyticsEvents.feedSave,
      metadata: {
        episode_id: input.episodeId,
        item_index: input.itemIndex,
        story_id: input.storyId
      },
      targetId: input.storyId,
      targetType: "story"
    });
    await trackServerEvent({
      eventName: existing ? analyticsEvents.unsaveStory : analyticsEvents.saveStory,
      metadata: {
        story_id: input.storyId,
        target_id: input.storyId,
        target_type: "story"
      },
      targetId: input.storyId,
      targetType: "story"
    });

    return { error: null, loginUrl: null, ok: true };
  }

  if (!input.creatorId) {
    return { error: "Không tìm thấy tác giả.", loginUrl: null, ok: false };
  }

  const { data: existing, error: existingError } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", userId)
    .eq("creator_id", input.creatorId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message, loginUrl: null, ok: false };
  }

  const { error } = existing
    ? await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("creator_id", input.creatorId)
    : await supabase.from("follows").insert({
        creator_id: input.creatorId,
        follower_id: userId,
        story_id: null
      });

  if (error) {
    return { error: error.message, loginUrl: null, ok: false };
  }

  await trackServerEvent({
    eventName: analyticsEvents.feedFollow,
    metadata: {
      creator_id: input.creatorId,
      episode_id: input.episodeId,
      item_index: input.itemIndex,
      story_id: input.storyId
    },
    targetId: input.creatorId,
    targetType: "creator"
  });
  await trackServerEvent({
    eventName: existing
      ? analyticsEvents.unfollowCreator
      : analyticsEvents.followCreator,
    metadata: {
      creator_id: input.creatorId,
      target_id: input.creatorId,
      target_type: "creator"
    },
    targetId: input.creatorId,
    targetType: "creator"
  });

  return { error: null, loginUrl: null, ok: true };
}
