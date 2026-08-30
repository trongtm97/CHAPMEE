"use server";

import { revalidatePath } from "next/cache";
import { createModerationCase } from "@/lib/admin/createModerationCase";
import { assertAnyPermission } from "@/lib/auth/require-permission";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";
import { awardMilestone } from "@/lib/data/milestones";
import {
  createBulkNotifications,
  createNotification
} from "@/lib/notifications/create-notification";
import { logAdminAction } from "@/lib/audit/log-admin-action";
import { createClient } from "@/lib/data/server";
import { invalidateStoryCatalogCache } from "@/lib/stories/getPublicStoriesCatalogCached";
import { ensureStoryPublicUrl } from "@/lib/stories/ensure-story-public-url";

async function requireAdminAction() {
  const guard = await requireAdminOrModerator("/admin/content");

  if (!guard.ok) {
    throw new Error(guard.error);
  }

  return guard.profile;
}

async function setPublishedAt(table: "stories" | "episodes", id: string) {
  const db = await createClient();
  const { data: current, error: currentError } = await db
    .from(table)
    .select("published_at")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (currentError) {
    throw new Error(currentError.message);
  }

  if (!current) {
    revalidatePath("/admin/content");
    return;
  }

  const approvePatch: Record<string, unknown> = {
    status: "approved",
    published_at: current.published_at ?? new Date().toISOString()
  };
  if (table === "stories") {
    approvePatch.visibility = "public";
  }

  const { error } = await db
    .from(table)
    .update(approvePatch)
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  if (table === "stories") {
    await ensureStoryPublicUrl(db, id);
    const { data: storyRow } = await db
      .from("stories")
      .select("creator_id, title")
      .eq("id", id)
      .maybeSingle();

    const { data: creatorProfile } = await db
      .from("creator_profiles")
      .select("user_id")
      .eq("id", storyRow?.creator_id ?? "")
      .maybeSingle();

    if (creatorProfile?.user_id) {
      await awardMilestone({
        userId: creatorProfile.user_id,
        milestoneKey: "first_story_published",
        relatedAuthorId: storyRow?.creator_id ?? null,
        metadata: {
          story_id: id,
          story_title: storyRow?.title ?? null
        }
      });

      await createNotification(creatorProfile.user_id, "milestone_achieved", {
        actionUrl: "/me#milestones",
        body: `Truyện "${storyRow?.title ?? "mới"}" của bạn đã được duyệt và xuất bản.`,
        dedupeWindowMinutes: 30,
        metadata: {
          story_id: id,
          story_title: storyRow?.title ?? null
        },
        targetId: id,
        targetType: "story",
        title: "Truyện của bạn đã được xuất bản"
      });
    }
  } else if (table === "episodes") {
    const { data: episodeRow } = await db
      .from("episodes")
      .select("id, title, episode_number, story_id, stories(title, slug, creator_id)")
      .eq("id", id)
      .maybeSingle();

    const story = Array.isArray(episodeRow?.stories)
      ? episodeRow.stories[0]
      : episodeRow?.stories;

    if (episodeRow?.story_id && story?.creator_id) {
      const { data: followerRows } = await db
        .from("follows")
        .select("follower_id")
        .or(`story_id.eq.${episodeRow.story_id},creator_id.eq.${story.creator_id}`);

      await createBulkNotifications(
        (followerRows ?? []).map((row) => row.follower_id),
        "new_chapter_from_followed_story",
        {
          actionUrl: episodeRow.id ? `/chapter/${episodeRow.id}` : "/notifications",
          body: `Chap ${episodeRow.episode_number} "${episodeRow.title}" vừa lên sóng.`,
          dedupeWindowMinutes: 5,
          metadata: {
            chapter_id: episodeRow.id,
            chapter_title: episodeRow.title,
            story_id: episodeRow.story_id,
            story_slug: story.slug ?? null,
            story_title: story.title ?? null
          },
          targetId: episodeRow.id,
          targetType: "chapter",
          title: `Có chap mới từ "${story.title ?? "truyện bạn theo dõi"}"`
        }
      );
    }
  }

  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/${table}/${id}`);
  if (table === "stories") {
    revalidatePath("/truyen");
    revalidatePath("/truyen-dich");
    revalidatePath("/truyen-sang-tac");
    invalidateStoryCatalogCache();
  }
}

export async function approveStoryAction(formData: FormData) {
  const profile = await requireAdminAction();
  await assertAnyPermission(["story.approve", "story.moderate"]);
  const storyId = String(formData.get("story_id") ?? "");
  await setPublishedAt("stories", storyId);
  await logAdminAction({
    actorId: profile.id,
    action: "approve_story",
    targetType: "story",
    targetId: storyId
  });
}

export async function rejectStoryAction(formData: FormData) {
  const profile = await requireAdminAction();
  await assertAnyPermission(["story.reject", "story.moderate"]);
  const storyId = String(formData.get("story_id") ?? "");
  const note = String(formData.get("moderation_note") ?? "").trim();
  const db = await createClient();
  const { error } = await db
    .from("stories")
    .update({ status: "rejected" })
    .eq("id", storyId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  await createModerationCase({
    actionTaken: "Rejected pending story",
    moderatorId: profile.id,
    note,
    targetId: storyId,
    targetType: "story"
  });
  await logAdminAction({
    actorId: profile.id,
    action: "reject_story",
    targetType: "story",
    targetId: storyId,
    metadata: { note: note || null }
  });
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/stories/${storyId}`);
}

export async function approveEpisodeAction(formData: FormData) {
  await requireAdminAction();
  await setPublishedAt("episodes", String(formData.get("episode_id") ?? ""));
}

export async function rejectEpisodeAction(formData: FormData) {
  const profile = await requireAdminAction();
  const episodeId = String(formData.get("episode_id") ?? "");
  const note = String(formData.get("moderation_note") ?? "").trim();
  const db = await createClient();
  const { error } = await db
    .from("episodes")
    .update({ status: "rejected" })
    .eq("id", episodeId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
  }

  await createModerationCase({
    actionTaken: "Rejected pending episode",
    moderatorId: profile.id,
    note,
    targetId: episodeId,
    targetType: "episode"
  });
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/episodes/${episodeId}`);
}
