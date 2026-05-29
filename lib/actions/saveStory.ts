"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { analyticsEvents } from "@/lib/analytics/events";
import { awardBadge } from "@/lib/supabase/badges";
import {
  appendMilestoneToastParams,
  awardMilestone,
  buildMilestoneToastNotice
} from "@/lib/supabase/milestones";
import { safeRecordFanScoreAction } from "@/lib/supabase/fan-scores";
import { trackServerEvent } from "@/lib/analytics/trackServerEvent";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { createClient } from "@/lib/supabase/server";

type SaveStoryInput = {
  storyId: string;
  storySlug: string;
  creatorId?: string | null;
  saved: boolean;
  returnTo: string;
};

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

export async function saveStoryAction(input: SaveStoryInput) {
  const userId = await getUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(input.returnTo)}`);
  }

  try {
    await assertActionAccess(input.saved ? "save.create" : "save.delete.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      redirect(
        `${input.returnTo}${input.returnTo.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.message)}`
      );
    }
    throw error;
  }

  const supabase = await createClient();
  let actionError: string | null = null;
  let milestoneRedirect: string | null = null;

  if (input.saved) {
    const { error } = await supabase.from("bookshelf_items").upsert(
      {
        user_id: userId,
        story_id: input.storyId,
        status: "saved"
      },
      { onConflict: "user_id,story_id" }
    );
    actionError = error?.message ?? null;
  } else {
    const { error } = await supabase
      .from("bookshelf_items")
      .delete()
      .eq("user_id", userId)
      .eq("story_id", input.storyId);
    actionError = error?.message ?? null;
  }

  if (!actionError) {
    if (input.saved) {
      await awardBadge({
        userId,
        badgeKey: "story_saver",
        metadata: {
          story_id: input.storyId
        },
        relatedStoryId: input.storyId
      });

      const milestone = await awardMilestone({
        userId,
        milestoneKey: "first_saved_story",
        metadata: {
          story_id: input.storyId,
          story_slug: input.storySlug
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
        authorId: input.creatorId ?? null,
        eventKey: "save_story",
        metadata: {
          story_id: input.storyId,
          story_slug: input.storySlug
        },
        sourceId: input.storyId,
        storyId: input.storyId,
        userId
      });
    }

    await trackServerEvent({
      eventName: input.saved
        ? analyticsEvents.saveStory
        : analyticsEvents.unsaveStory,
      metadata: {
        story_id: input.storyId,
        target_id: input.storyId,
        target_type: "story"
      },
      targetId: input.storyId,
      targetType: "story"
    });
  }

  revalidatePath(input.returnTo);
  revalidatePath(`/stories/${input.storySlug}`);
  revalidatePath("/me/library");

  if (milestoneRedirect) {
    redirect(milestoneRedirect);
  }
}
