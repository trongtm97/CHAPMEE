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
import { trackServerUserAction } from "@/lib/tracking/track-server";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { createClient } from "@/lib/data/server";
import type { TaxonomySourceSurface } from "@/types/taxonomy-analytics";
import { mapTrackingSurfaceToTaxonomySource } from "@/lib/taxonomy-analytics/map-source-surface";
import type { TrackingSurface } from "@/types/tracking";

type SaveStoryInput = {
  storyId: string;
  storySlug: string;
  creatorId?: string | null;
  saved: boolean;
  returnTo: string;
  sourceSurface?: TaxonomySourceSurface | string;
  trackingSurface?: TrackingSurface;
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

  const db = await createClient();
  let actionError: string | null = null;
  let milestoneRedirect: string | null = null;

  if (input.saved) {
    const { error } = await db.from("bookshelf_items").upsert(
      {
        user_id: userId,
        story_id: input.storyId,
        status: "saved"
      },
      { onConflict: "user_id,story_id" }
    );
    actionError = error?.message ?? null;
  } else {
    const { error } = await db
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

    await trackServerUserAction(userId, {
      surface: input.trackingSurface ?? "story_detail",
      actionType: input.saved ? "save" : "unsave",
      itemType: "story",
      itemId: input.storyId,
      storyId: input.storyId,
      metadata: input.sourceSurface
        ? { source_surface: input.sourceSurface }
        : undefined
    });

    if (input.saved) {
      const { trackTaxonomyStorySaveServer } = await import(
        "@/lib/analytics/track-taxonomy-server"
      );
      await trackTaxonomyStorySaveServer({
        storyId: input.storyId,
        sourceSurface:
          input.sourceSurface ??
          mapTrackingSurfaceToTaxonomySource(input.trackingSurface ?? "story_detail")
      });
    }
  }

  revalidatePath(input.returnTo);
  revalidatePath(`/stories/${input.storySlug}`);
  revalidatePath("/me/library");

  if (milestoneRedirect) {
    redirect(milestoneRedirect);
  }
}
