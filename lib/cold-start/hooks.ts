import { createAdminClient } from "@/lib/data/admin";
import { onReelPublished, onStoryPublished } from "@/lib/cold-start/create";

export async function triggerColdStartAfterStoryPublish(storyId: string) {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("stories")
      .select("creator_profiles(user_id)")
      .eq("id", storyId)
      .maybeSingle();

    const creator = Array.isArray(data?.creator_profiles)
      ? data?.creator_profiles[0]
      : data?.creator_profiles;
    const authorUserId = creator?.user_id as string | undefined;

    if (!authorUserId) return;

    await onStoryPublished(db, storyId, authorUserId);
  } catch {
    // Cold start is best-effort; publish must not fail.
  }
}

export async function triggerColdStartAfterReelPublish(reelId: string) {
  try {
    const db = createAdminClient();
    await onReelPublished(db, reelId);
  } catch {
    // best-effort
  }
}
