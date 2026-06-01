import { createAdminClient } from "@/lib/supabase/admin";
import { onReelPublished, onStoryPublished } from "@/lib/cold-start/create";

export async function triggerColdStartAfterStoryPublish(storyId: string) {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("stories")
      .select("creator_profiles(user_id)")
      .eq("id", storyId)
      .maybeSingle();

    const creator = Array.isArray(data?.creator_profiles)
      ? data?.creator_profiles[0]
      : data?.creator_profiles;
    const authorUserId = creator?.user_id as string | undefined;

    if (!authorUserId) return;

    await onStoryPublished(supabase, storyId, authorUserId);
  } catch {
    // Cold start is best-effort; publish must not fail.
  }
}

export async function triggerColdStartAfterReelPublish(reelId: string) {
  try {
    const supabase = createAdminClient();
    await onReelPublished(supabase, reelId);
  } catch {
    // best-effort
  }
}
