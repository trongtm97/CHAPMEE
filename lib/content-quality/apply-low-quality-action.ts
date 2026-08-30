import type { DatabaseClient } from "@/lib/db/types";
import { calculateQualitySignals } from "@/lib/content-quality/calculate-quality-signals";
import { notifyAuthorContentQuality } from "@/lib/content-quality/notify-author";
import { statusForAttempt } from "@/lib/content-quality/labels";
import type {
  ContentQualityActionTaken,
  ContentQualityReasonCode,
  ContentQualityStatus
} from "@/types/content-quality";

export async function disableStoryMonetizationByQuality(
  db: DatabaseClient,
  storyId: string
) {
  await db
    .from("stories")
    .update({
      monetization_disabled_by_quality: true,
      quality_updated_at: new Date().toISOString()
    })
    .eq("id", storyId);

  const { data: episodes } = await db
    .from("episodes")
    .select("id")
    .eq("story_id", storyId);

  const episodeIds = (episodes ?? []).map((e) => e.id);

  if (episodeIds.length > 0) {
    await db
      .from("chapter_monetization_settings")
      .update({ is_paid: false })
      .in("chapter_id", episodeIds);
  }
}

export async function applyPermanentQualityHide(
  db: DatabaseClient,
  storyId: string
) {
  const now = new Date().toISOString();

  await db
    .from("stories")
    .update({
      low_quality_attempt_count: 3,
      quality_status: "permanently_hidden_low_quality",
      quality_updated_at: now,
      visibility: "private"
    })
    .eq("id", storyId);

  await db
    .from("episodes")
    .update({
      quality_status: "permanently_hidden_low_quality",
      quality_updated_at: now
    })
    .eq("story_id", storyId);

  await disableStoryMonetizationByQuality(db, storyId);
}

export async function applyModeratorLowQualityConfirmation(input: {
  db: DatabaseClient;
  targetType: "story" | "chapter";
  targetId: string;
  storyId: string;
  authorId: string;
  authorUserId: string;
  reviewedBy: string;
  reasonCodes: ContentQualityReasonCode[];
  moderatorNote?: string | null;
  signalSnapshot?: Record<string, unknown> | null;
}): Promise<{ ok: true; attempt: number; status: ContentQualityStatus } | { ok: false; error: string }> {
  const { data: story } = await input.db
    .from("stories")
    .select("id, title, low_quality_attempt_count, quality_status")
    .eq("id", input.storyId)
    .maybeSingle();

  if (!story) {
    return { error: "Không tìm thấy truyện.", ok: false };
  }

  if (story.quality_status === "permanently_hidden_low_quality") {
    return { error: "Truyện đã bị ẩn vĩnh viễn.", ok: false };
  }

  const nextAttempt = Math.min(3, (story.low_quality_attempt_count ?? 0) + 1);

  let signalSnapshot = input.signalSnapshot;

  if (!signalSnapshot) {
    const calculated = await calculateQualitySignals({
      storyId: input.storyId,
      db: input.db,
      targetId: input.targetId,
      targetType: input.targetType
    });
    signalSnapshot = calculated.snapshot;
  }

  const reasonCodes = [
    ...new Set([
      ...input.reasonCodes,
      "moderator_confirmed_low_quality" as ContentQualityReasonCode
    ])
  ];

  let status: ContentQualityStatus;
  let actionTaken: ContentQualityActionTaken;

  if (nextAttempt >= 3) {
    status = "permanently_hidden_low_quality";
    actionTaken = "permanently_hidden";
    await applyPermanentQualityHide(input.db, input.storyId);
  } else {
    status = statusForAttempt(nextAttempt);
    actionTaken = "warning_only";

    await input.db
      .from("stories")
      .update({
        low_quality_attempt_count: nextAttempt,
        quality_status: status,
        quality_updated_at: new Date().toISOString()
      })
      .eq("id", input.storyId);

    if (input.targetType === "chapter") {
      await input.db
        .from("episodes")
        .update({
          low_quality_attempt_count: nextAttempt,
          quality_status: status,
          quality_updated_at: new Date().toISOString()
        })
        .eq("id", input.targetId);
    }
  }

  await input.db.from("content_quality_reviews").insert({
    action_taken: actionTaken,
    attempt_number: nextAttempt,
    author_id: input.authorId,
    author_note: null,
    chapter_id: input.targetType === "chapter" ? input.targetId : null,
    moderator_note: input.moderatorNote ?? null,
    reason_codes: reasonCodes,
    reviewed_by: input.reviewedBy,
    signal_snapshot: signalSnapshot,
    status,
    story_id: input.storyId,
    target_id: input.targetId,
    target_type: input.targetType
  });

  if (nextAttempt >= 3) {
    await input.db.from("content_quality_reviews").insert({
      action_taken: "monetization_disabled",
      attempt_number: nextAttempt,
      author_id: input.authorId,
      chapter_id: null,
      moderator_note: input.moderatorNote ?? null,
      reason_codes: reasonCodes,
      reviewed_by: input.reviewedBy,
      signal_snapshot: signalSnapshot,
      status,
      story_id: input.storyId,
      target_id: input.targetId,
      target_type: input.targetType
    });
  }

  await notifyAuthorContentQuality({
    attemptNumber: nextAttempt,
    authorUserId: input.authorUserId,
    status,
    storyId: input.storyId,
    storyTitle: story.title
  });

  return { attempt: nextAttempt, ok: true, status };
}

export async function restoreStoryQuality(input: {
  db: DatabaseClient;
  storyId: string;
  authorId: string;
  reviewedBy: string;
  moderatorNote?: string | null;
}) {
  const now = new Date().toISOString();

  await input.db
    .from("stories")
    .update({
      low_quality_attempt_count: 0,
      monetization_disabled_by_quality: false,
      quality_status: "restored",
      quality_updated_at: now
    })
    .eq("id", input.storyId);

  await input.db
    .from("episodes")
    .update({
      low_quality_attempt_count: 0,
      quality_status: "restored",
      quality_updated_at: now
    })
    .eq("story_id", input.storyId);

  const { data: story } = await input.db
    .from("stories")
    .select("title, creator_profiles(user_id)")
    .eq("id", input.storyId)
    .maybeSingle();

  await input.db.from("content_quality_reviews").insert({
    action_taken: "restored",
    attempt_number: 0,
    author_id: input.authorId,
    moderator_note: input.moderatorNote ?? null,
    reason_codes: [],
    reviewed_by: input.reviewedBy,
    status: "restored",
    story_id: input.storyId,
    target_id: input.storyId,
    target_type: "story"
  });

  const creator = Array.isArray(story?.creator_profiles)
    ? story?.creator_profiles[0]
    : story?.creator_profiles;

  if (creator?.user_id && story?.title) {
    await notifyAuthorContentQuality({
      attemptNumber: 0,
      authorUserId: creator.user_id,
      status: "restored",
      storyId: input.storyId,
      storyTitle: story.title
    });
  }
}
