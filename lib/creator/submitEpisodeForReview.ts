"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCreatorOwnsEpisode } from "@/lib/creator/assertCreatorOwnsEpisode";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { createClient } from "@/lib/data/server";

export async function submitEpisodeForReviewAction(formData: FormData) {
  const storyId = String(formData.get("story_id") ?? "");
  const episodeId = String(formData.get("episode_id") ?? "");
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile } = await requireCreatorProfile(
    `${returnBasePath}/stories/${storyId}/episodes`
  );

  try {
    await assertActionAccess("chapter.publish.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const db = await createClient();
  const episode = await assertCreatorOwnsEpisode(
    creatorProfile,
    storyId,
    episodeId
  );

  if (episode.status === "draft" || episode.status === "pending") {
    const { error } = await db
      .from("episodes")
      .update({
        status: "published",
        published_at: new Date().toISOString()
      })
      .eq("id", episodeId)
      .eq("story_id", storyId);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`${returnBasePath}/stories/${storyId}/episodes`);
}
