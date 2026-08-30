import { analyticsEvents } from "@/lib/analytics/events";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { safeRecordFanScoreAction } from "@/lib/data/fan-scores";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import { getOptionalSessionUser } from "@/lib/auth/get-optional-session-user";
import { trackServerUserAction } from "@/lib/tracking/track-server";
import { createClient } from "@/lib/data/server";

type ReelsEngagementAction = "follow" | "like" | "save" | "share";

type MutateReelsEngagementInput = {
  action: ReelsEngagementAction;
  creatorId?: string | null;
  creatorUserId?: string | null;
  episodeId: string;
  itemIndex: number;
  reelItemId?: string | null;
  storyId: string;
};

type MutateReelsEngagementResult = {
  error: string | null;
  loginUrl: string | null;
  ok: boolean;
};

async function requireReelsUser() {
  const db = await createClient();
  const user = await getOptionalSessionUser();

  if (!user) {
    return {
      loginUrl: `/login?next=${REELS_PUBLIC_PATH}`,
      db: null,
      userId: null
    };
  }

  return {
    loginUrl: null,
    db,
    userId: user.id
  };
}

function reelsTrackingBase(input: MutateReelsEngagementInput) {
  return {
    authorUserId: input.creatorUserId ?? null,
    chapterId: input.episodeId,
    itemIndex: input.itemIndex,
    reelId: input.reelItemId ?? null,
    storyId: input.storyId
  };
}

export async function mutateReelsEngagement(
  input: MutateReelsEngagementInput
): Promise<MutateReelsEngagementResult> {
  const base = reelsTrackingBase(input);

  if (input.action === "share") {
    const auth = await requireReelsUser();

    await trackServerEvent({
      eventName: analyticsEvents.reelsShareClicked,
      metadata: {
        episode_id: input.episodeId,
        item_index: input.itemIndex,
        reel_item_id: input.reelItemId ?? null,
        story_id: input.storyId
      },
      targetId: input.storyId,
      targetType: "story"
    });
    await trackServerEvent({
      eventName: analyticsEvents.feedShare,
      metadata: {
        episode_id: input.episodeId,
        item_index: input.itemIndex,
        reel_item_id: input.reelItemId ?? null,
        story_id: input.storyId
      },
      targetId: input.storyId,
      targetType: "story"
    });

    await trackServerUserAction(auth.userId, {
      actionType: "share",
      authorUserId: base.authorUserId,
      chapterId: base.chapterId,
      itemId: input.storyId,
      itemType: "story",
      reelId: base.reelId,
      storyId: input.storyId,
      surface: "reels",
      valueNumeric: input.itemIndex
    });

    if (auth.userId) {
      await safeRecordFanScoreAction({
        authorId: input.creatorId ?? null,
        eventKey: "share_clicked",
        metadata: {
          episode_id: input.episodeId,
          source: "reels",
          story_id: input.storyId
        },
        sourceId: input.storyId,
        storyId: input.storyId,
        userId: auth.userId
      });
    }

    return { error: null, loginUrl: null, ok: true };
  }

  const auth = await requireReelsUser();

  if (!auth.db || !auth.userId) {
    return { error: null, loginUrl: auth.loginUrl, ok: false };
  }

  const { db, userId } = auth;

  if (input.action === "like") {
    const { data: existing, error: existingError } = await db
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

    if (existing) {
      const { error } = await db
        .from("reactions")
        .delete()
        .eq("user_id", userId)
        .eq("target_id", input.episodeId)
        .eq("target_type", "episode")
        .eq("reaction_type", "like");

      if (error) {
        return { error: error.message, loginUrl: null, ok: false };
      }
    } else {
      const { error } = await db.from("reactions").upsert(
        {
          reaction_type: "like",
          target_id: input.episodeId,
          target_type: "episode",
          user_id: userId
        },
        { onConflict: "user_id,target_type,target_id,reaction_type" }
      );

      if (error) {
        return { error: error.message, loginUrl: null, ok: false };
      }

      await safeRecordFanScoreAction({
        authorId: input.creatorId ?? null,
        eventKey: "like_content",
        metadata: {
          episode_id: input.episodeId,
          source: "reels",
          story_id: input.storyId
        },
        sourceId: input.episodeId,
        storyId: input.storyId,
        userId
      });
    }

    await trackServerUserAction(userId, {
      actionType: existing ? "unlike" : "like",
      authorUserId: base.authorUserId,
      chapterId: base.chapterId,
      itemId: input.episodeId,
      itemType: "chapter",
      reelId: base.reelId,
      storyId: input.storyId,
      surface: "reels",
      valueNumeric: input.itemIndex
    });
    await trackServerEvent({
      eventName: analyticsEvents.reelsLikeClicked,
      metadata: {
        episode_id: input.episodeId,
        item_index: input.itemIndex,
        reaction: existing ? "unlike" : "like",
        reel_item_id: input.reelItemId ?? null,
        story_id: input.storyId
      },
      targetId: input.storyId,
      targetType: "story"
    });

    return { error: null, loginUrl: null, ok: true };
  }

  if (input.action === "save") {
    const { data: existing, error: existingError } = await db
      .from("bookshelf_items")
      .select("id")
      .eq("user_id", userId)
      .eq("story_id", input.storyId)
      .maybeSingle();

    if (existingError) {
      return { error: existingError.message, loginUrl: null, ok: false };
    }

    const { error } = existing
      ? await db
          .from("bookshelf_items")
          .delete()
          .eq("user_id", userId)
          .eq("story_id", input.storyId)
      : await db.from("bookshelf_items").upsert(
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

    if (!existing) {
      await safeRecordFanScoreAction({
        authorId: input.creatorId ?? null,
        eventKey: "save_story",
        metadata: {
          episode_id: input.episodeId,
          source: "reels",
          story_id: input.storyId
        },
        sourceId: input.storyId,
        storyId: input.storyId,
        userId
      });
    }

    await trackServerUserAction(userId, {
      actionType: existing ? "unsave" : "save",
      authorUserId: base.authorUserId,
      chapterId: base.chapterId,
      itemId: input.storyId,
      itemType: "story",
      reelId: base.reelId,
      storyId: input.storyId,
      surface: "reels",
      valueNumeric: input.itemIndex
    });
    await trackServerEvent({
      eventName: analyticsEvents.reelsSaveClicked,
      metadata: {
        episode_id: input.episodeId,
        item_index: input.itemIndex,
        reaction: existing ? "unsave" : "save",
        reel_item_id: input.reelItemId ?? null,
        story_id: input.storyId
      },
      targetId: input.storyId,
      targetType: "story"
    });
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

  const { data: existing, error: existingError } = await db
    .from("follows")
    .select("id")
    .eq("follower_id", userId)
    .eq("creator_id", input.creatorId)
    .maybeSingle();

  if (existingError) {
    return { error: existingError.message, loginUrl: null, ok: false };
  }

  const { error } = existing
    ? await db
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("creator_id", input.creatorId)
    : await db.from("follows").insert({
        creator_id: input.creatorId,
        follower_id: userId,
        story_id: null
      });

  if (error) {
    return { error: error.message, loginUrl: null, ok: false };
  }

  await trackServerUserAction(userId, {
    actionType: existing ? "unfollow_author" : "follow_author",
    authorUserId: base.authorUserId,
    chapterId: base.chapterId,
    itemId: input.creatorId,
    itemType: "author_profile",
    reelId: base.reelId,
    storyId: input.storyId,
    surface: "reels",
    valueNumeric: input.itemIndex
  });
  await trackServerEvent({
    eventName: analyticsEvents.reelsFollowAuthorClicked,
    metadata: {
      creator_id: input.creatorId,
      episode_id: input.episodeId,
      item_index: input.itemIndex,
      reaction: existing ? "unfollow" : "follow",
      story_id: input.storyId
    },
    targetId: input.creatorId,
    targetType: "creator"
  });
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
