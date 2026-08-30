"use server";

import { createEpisodeAction } from "@/lib/creator/createEpisode";
import { updateEpisodeAction } from "@/lib/creator/updateEpisode";

/** Single-arg chapter submit — same contract as Reels actions (no useActionState wrapper). */
export async function submitStudioChapterAction(formData: FormData) {
  const episodeId = String(formData.get("episode_id") ?? "").trim();

  if (episodeId) {
    return updateEpisodeAction({ error: null }, formData);
  }

  return createEpisodeAction({ error: null }, formData);
}
