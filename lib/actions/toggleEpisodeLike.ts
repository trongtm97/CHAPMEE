"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { safeRecordFanScoreAction } from "@/lib/data/fan-scores";
import { createClient } from "@/lib/data/server";

type ToggleEpisodeLikeInput = {
  episodeId: string;
  liked: boolean;
  creatorId?: string | null;
  storyId?: string | null;
  returnTo: string;
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

export async function toggleEpisodeLikeAction(input: ToggleEpisodeLikeInput) {
  const userId = await getUserId();

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent(input.returnTo)}`);
  }

  const db = await createClient();

  if (input.liked) {
    await db.from("reactions").upsert(
      {
        user_id: userId,
        target_id: input.episodeId,
        target_type: "episode",
        reaction_type: "like"
      },
      { onConflict: "user_id,target_type,target_id,reaction_type" }
    );

    await safeRecordFanScoreAction({
      authorId: input.creatorId ?? null,
      eventKey: "like_content",
      metadata: {
        episode_id: input.episodeId,
        story_id: input.storyId ?? null
      },
      sourceId: input.episodeId,
      storyId: input.storyId ?? null,
      userId
    });
  } else {
    await db
      .from("reactions")
      .delete()
      .eq("user_id", userId)
      .eq("target_id", input.episodeId)
      .eq("target_type", "episode")
      .eq("reaction_type", "like");
  }

  revalidatePath(input.returnTo);
}
