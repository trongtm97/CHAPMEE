"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { createClient } from "@/lib/data/server";
import { awardBadge } from "@/lib/data/badges";
import { awardStoryEarlyFanForStory } from "@/lib/data/early-fans";
import { safeRecordFanScoreAction } from "@/lib/data/fan-scores";
import { getSiteOrigin } from "@/lib/brand/site-origin";
import { createNotification } from "@/lib/notifications/create-notification";
import { trackServerUserAction } from "@/lib/tracking/track-server";

type FollowStoryInput = {
  storyId: string;
  storySlug: string;
  storyTitle: string;
  creatorId?: string | null;
  following: boolean;
  returnTo: string;
};

function buildReturnUrl(
  returnTo: string,
  params: Record<string, string | undefined>
) {
  const url = new URL(returnTo, getSiteOrigin());

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

async function getUserId() {
  const db = await createClient();
  const {
    data: { user },
    error
  } = await db.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function followStoryAction(input: FollowStoryInput) {
  const userId = await getUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(input.returnTo)}`);
  }

  try {
    await assertActionAccess(input.following ? "follow.create" : "follow.delete.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      redirect(
        buildReturnUrl(input.returnTo, { error: error.message })
      );
    }
    throw error;
  }

  const db = await createClient();
  let actionSucceeded = false;
  let fanNotice: Awaited<ReturnType<typeof awardStoryEarlyFanForStory>>["notice"] = null;

  if (input.following) {
    const { data: existing, error: existingError } = await db
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("story_id", input.storyId)
      .maybeSingle();

    if (existingError) {
      revalidatePath(input.returnTo);
      revalidatePath(`/stories/${input.storySlug}`);
      return;
    }

    if (!existing) {
      const { error } = await db.from("follows").insert({
        follower_id: userId,
        story_id: input.storyId,
        creator_id: null
      });
      actionSucceeded = !error || error?.code === "23505";

      if (!error) {
        await safeRecordFanScoreAction({
          authorId: input.creatorId ?? null,
          eventKey: "follow_story",
          metadata: {
            story_id: input.storyId,
            story_slug: input.storySlug,
            story_title: input.storyTitle
          },
          sourceId: input.storyId,
          storyId: input.storyId,
          userId
        });
        const awardResult = await awardStoryEarlyFanForStory({
          storyId: input.storyId,
          userId
        });
        fanNotice = awardResult.notice;
      }
    } else {
      actionSucceeded = true;
    }
  } else {
    const { error } = await db
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("story_id", input.storyId);
    actionSucceeded = !error;
  }

  if (!actionSucceeded) {
    revalidatePath(input.returnTo);
    revalidatePath(`/stories/${input.storySlug}`);
    return;
  }

  revalidatePath(input.returnTo);
  revalidatePath(`/stories/${input.storySlug}`);
  revalidatePath("/me/library");

  await trackServerUserAction(userId, {
    surface: "story_detail",
    actionType: input.following ? "follow_author" : "unfollow_author",
    itemType: "story",
    itemId: input.storyId,
    storyId: input.storyId,
    valueText: "story_follow"
  });

  if (fanNotice) {
    await createNotification(userId, "became_early_fan", {
      actionUrl: `/stories/${fanNotice.storySlug}`,
      body: `Bạn trở thành Fan đời đầu của "${fanNotice.storyTitle}".`,
      dedupeWindowMinutes: 1_440,
      metadata: {
        followers_at_award: fanNotice.followersAtAward,
        reads_at_award: fanNotice.readsAtAward,
        story_id: fanNotice.storyId,
        story_slug: fanNotice.storySlug
      },
      targetId: fanNotice.storyId,
      targetType: "story",
      title: "Bạn vừa nhận danh hiệu Fan đời đầu"
    });

    await awardBadge({
      userId,
      badgeKey: "early_fan",
      metadata: {
        followers_at_award: fanNotice.followersAtAward,
        reads_at_award: fanNotice.readsAtAward,
        story_id: fanNotice.storyId,
        story_slug: fanNotice.storySlug,
        story_title: fanNotice.storyTitle
      },
      relatedStoryId: fanNotice.storyId
    });

    redirect(
      buildReturnUrl(input.returnTo, {
        fanEarly: "1",
        fanStoryId: fanNotice.storyId,
        fanStorySlug: fanNotice.storySlug,
        fanStoryTitle: fanNotice.storyTitle
      })
    );
  }
}
