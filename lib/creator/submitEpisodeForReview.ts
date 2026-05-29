"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCreatorOwnsEpisode } from "@/lib/creator/assertCreatorOwnsEpisode";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { createClient } from "@/lib/supabase/server";

export async function submitEpisodeForReviewAction(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "");
  const episodeId = String(formData.get("episode_id") ?? "");
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect(`/login?next=${returnBasePath}/stories/${storyId}/episodes`);
  }

  if (!creatorProfile) {
    redirect("/studio/setup");
  }

  try {
    await assertActionAccess("chapter.publish.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const supabase = await createClient();
  const episode = await assertCreatorOwnsEpisode(
    creatorProfile,
    storyId,
    episodeId
  );

  if (episode.status === "draft") {
    const { error } = await supabase
      .from("episodes")
      .update({ status: "pending" })
      .eq("id", episodeId)
      .eq("story_id", storyId);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`${returnBasePath}/stories/${storyId}/episodes`);
}
