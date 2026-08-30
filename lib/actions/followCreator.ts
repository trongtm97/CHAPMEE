"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyticsEvents } from "@/lib/analytics/events";
import { awardBadge } from "@/lib/data/badges";
import {
  appendMilestoneToastParams,
  awardMilestone,
  buildMilestoneToastNotice
} from "@/lib/data/milestones";
import { safeRecordFanScoreAction } from "@/lib/data/fan-scores";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { createClient } from "@/lib/data/server";
import { createNotification } from "@/lib/notifications/create-notification";

type FollowCreatorInput = {
  creatorId: string;
  storySlug?: string;
  following: boolean;
  returnTo: string;
};

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

export async function followCreatorAction(input: FollowCreatorInput) {
  const userId = await getUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(input.returnTo)}`);
  }

  try {
    await assertActionAccess(input.following ? "follow.create" : "follow.delete.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      redirect(
        `${input.returnTo}${input.returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`
      );
    }
    throw error;
  }

  const db = await createClient();
  let actionSucceeded = false;
  let milestoneRedirect: string | null = null;

  if (input.following) {
    const { data: existing } = await db
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("creator_id", input.creatorId)
      .maybeSingle();

    if (!existing) {
      const { error } = await db.from("follows").insert({
        follower_id: userId,
        creator_id: input.creatorId,
        story_id: null
      });
      actionSucceeded = !error;
    } else {
      actionSucceeded = true;
    }
  } else {
    const { error } = await db
      .from("follows")
      .delete()
      .eq("follower_id", userId)
      .eq("creator_id", input.creatorId);
    actionSucceeded = !error;
  }

  if (actionSucceeded) {
    if (input.following) {
      const { data: creatorOwner } = await db
        .from("creator_profiles")
        .select("user_id, pen_name")
        .eq("id", input.creatorId)
        .maybeSingle();

      await awardBadge({
        userId,
        badgeKey: "author_follower",
        metadata: {
          creator_id: input.creatorId
        }
      });

      const milestone = await awardMilestone({
        userId,
        milestoneKey: "first_followed_author",
        metadata: {
          creator_id: input.creatorId
        }
      });

      if (milestone.awarded && milestone.milestone) {
        const notice = buildMilestoneToastNotice({
          description: milestone.milestone.description,
          href: "/me#milestones",
          title: milestone.milestone.title
        });

        milestoneRedirect = appendMilestoneToastParams(input.returnTo, notice);
      }

      await safeRecordFanScoreAction({
        authorId: input.creatorId,
        eventKey: "follow_author",
        metadata: {
          creator_id: input.creatorId
        },
        sourceId: input.creatorId,
        userId
      });

      if (creatorOwner?.user_id && creatorOwner.user_id !== userId) {
        await createNotification(creatorOwner.user_id, "new_follower", {
          actorUserId: userId,
          actionUrl: "/studio",
          body: "Một độc giả vừa theo dõi bạn. Hãy vào trang tác giả để xem chi tiết.",
          dedupeWindowMinutes: 10,
          metadata: {
            creator_id: input.creatorId,
            follower_user_id: userId
          },
          targetId: input.creatorId,
          targetType: "author",
          title: `Bạn có follower mới${creatorOwner.pen_name ? ` cho ${creatorOwner.pen_name}` : ""}`
        });
      }
    }

    await trackServerEvent({
      eventName: input.following
        ? analyticsEvents.followCreator
        : analyticsEvents.unfollowCreator,
      metadata: {
        creator_id: input.creatorId,
        target_id: input.creatorId,
        target_type: "creator"
      },
      targetId: input.creatorId,
      targetType: "creator"
    });
  }

  revalidatePath(input.returnTo);
  revalidatePath("/me/library");
  if (input.storySlug) {
    revalidatePath(`/stories/${input.storySlug}`);
  }

  if (milestoneRedirect) {
    redirect(milestoneRedirect);
  }
}
