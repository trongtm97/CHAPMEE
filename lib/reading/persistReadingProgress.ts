import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { createClient } from "@/lib/supabase/server";

export type ReadingProgressInput = {
  storyId: string;
  episodeId: string;
  progressPercent: number;
};

export async function persistReadingProgress(input: ReadingProgressInput) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return;
  }

  try {
    await assertActionAccess("notification.view.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return;
    }
    throw error;
  }

  const nextProgress = Math.max(0, Math.min(100, input.progressPercent));
  const { data: existing } = await supabase
    .from("reading_progress")
    .select("progress_percent")
    .eq("user_id", user.id)
    .eq("story_id", input.storyId)
    .maybeSingle();
  const existingProgress = Number(existing?.progress_percent ?? 0);

  await supabase.from("reading_progress").upsert(
    {
      user_id: user.id,
      story_id: input.storyId,
      episode_id: input.episodeId,
      progress_percent: Math.max(existingProgress, nextProgress)
    },
    { onConflict: "user_id,story_id" }
  );
}
