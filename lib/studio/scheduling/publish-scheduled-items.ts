import { publishTargetByType } from "@/lib/studio/scheduling/publish-target";
import { studioPath } from "@/lib/studio/constants";
import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_ATTEMPTS = 3;

type ScheduleRow = {
  id: string;
  creator_id: string;
  target_type: "story" | "chapter" | "reels";
  target_id: string;
  story_id: string | null;
  publish_attempts: number;
};

async function resolveCreatorProfileId(
  supabase: SupabaseClient,
  profileId: string
) {
  const { data } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", profileId)
    .maybeSingle();

  return data?.id as string | undefined;
}

async function notifyScheduleResult(
  supabase: SupabaseClient,
  profileId: string,
  success: boolean,
  label: string,
  actionUrl: string
) {
  await supabase.from("notifications").insert({
    action_url: actionUrl,
    body: success
      ? `${label} đã được đăng thành công.`
      : `Lịch đăng thất bại cho ${label}, vui lòng kiểm tra lại.`,
    title: success ? "Đăng theo lịch thành công" : "Lịch đăng thất bại",
    type: success ? "schedule_publish_success" : "schedule_publish_failed",
    user_id: profileId
  });
}

export async function publishScheduledItems(supabase: SupabaseClient) {
  const now = new Date().toISOString();

  const { data: dueRows, error } = await supabase
    .from("scheduled_publications")
    .select("id, creator_id, target_type, target_id, story_id, publish_attempts")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(50);

  if (error) {
    return { error: error.message, failed: 0, published: 0 };
  }

  let published = 0;
  let failed = 0;

  for (const row of (dueRows ?? []) as ScheduleRow[]) {
    const creatorProfileId = await resolveCreatorProfileId(supabase, row.creator_id);

    if (!creatorProfileId) {
      await supabase
        .from("scheduled_publications")
        .update({
          last_error: "Không tìm thấy hồ sơ tác giả.",
          publish_attempts: row.publish_attempts + 1,
          status: row.publish_attempts + 1 >= MAX_ATTEMPTS ? "failed" : "scheduled"
        })
        .eq("id", row.id);
      failed += 1;
      continue;
    }

    const result = await publishTargetByType(
      supabase,
      row.target_type,
      row.target_id,
      row.story_id,
      creatorProfileId
    );

    if (result.ok) {
      const publishedAt = new Date().toISOString();

      await supabase
        .from("scheduled_publications")
        .update({
          last_error: null,
          published_at: publishedAt,
          status: "published"
        })
        .eq("id", row.id)
        .eq("status", "scheduled");

      published += 1;

      let notifyHref = studioPath("/calendar");
      if (row.story_id) {
        if (row.target_type === "story") {
          const { data: storyRow } = await supabase
            .from("stories")
            .select("structure_type")
            .eq("id", row.story_id)
            .maybeSingle();
          notifyHref =
            storyRow?.structure_type === "standalone"
              ? studioPath(`/stories/${row.story_id}/content`)
              : studioPath(`/stories/${row.story_id}/edit`);
        } else {
          notifyHref = studioPath(`/stories/${row.story_id}/chapters`);
        }
      }

      await notifyScheduleResult(
        supabase,
        row.creator_id,
        true,
        row.target_type === "chapter" ? "Chương" : "Truyện",
        notifyHref
      );
    } else {
      const attempts = row.publish_attempts + 1;
      const nextStatus = attempts >= MAX_ATTEMPTS ? "failed" : "scheduled";

      await supabase
        .from("scheduled_publications")
        .update({
          last_error: result.error ?? "Publish failed",
          publish_attempts: attempts,
          status: nextStatus
        })
        .eq("id", row.id);

      failed += 1;

      if (nextStatus === "failed") {
        await notifyScheduleResult(
          supabase,
          row.creator_id,
          false,
          row.target_type === "chapter" ? "Chương" : "Truyện",
          studioPath("/calendar")
        );
      }
    }
  }

  return { error: null, failed, published };
}
