import type { DatabaseClient } from "@/lib/db/types";

export async function cancelScheduledPublication(
  db: DatabaseClient,
  scheduleId: string,
  profileId: string,
  creatorProfileId: string
) {
  const { data: row, error: fetchError } = await db
    .from("scheduled_publications")
    .select("id, target_type, target_id, story_id, status")
    .eq("id", scheduleId)
    .eq("creator_id", profileId)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message, ok: false as const };
  }

  if (!row) {
    return { error: "Không tìm thấy lịch đăng.", ok: false as const };
  }

  if (row.status !== "scheduled") {
    return { error: "Chỉ có thể hủy lịch đang chờ đăng.", ok: false as const };
  }

  const now = new Date().toISOString();

  const { error: updateError } = await db
    .from("scheduled_publications")
    .update({
      canceled_at: now,
      status: "canceled"
    })
    .eq("id", scheduleId);

  if (updateError) {
    return { error: updateError.message, ok: false as const };
  }

  if (row.target_type === "story") {
    const { data: story } = await db
      .from("stories")
      .select("status")
      .eq("id", row.target_id)
      .eq("creator_id", creatorProfileId)
      .maybeSingle();

    if (story && story.status !== "published") {
      await db
        .from("stories")
        .update({ status: "draft" })
        .eq("id", row.target_id);
    }
  }

  if (row.target_type === "chapter" && row.story_id) {
    const { data: episode } = await db
      .from("episodes")
      .select("status")
      .eq("id", row.target_id)
      .eq("story_id", row.story_id)
      .maybeSingle();

    if (episode && episode.status !== "published") {
      await db
        .from("episodes")
        .update({ status: "draft" })
        .eq("id", row.target_id);
    }
  }

  return { ok: true as const };
}
