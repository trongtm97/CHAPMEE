"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { requireCreatorProfile } from "@/lib/creator/require-creator-profile";
import {
  assertStoryIsStandalone,
  parseStandaloneContentFromForm,
  resolveStandaloneStoryContentPersist
} from "@/lib/creator/persist-standalone-story-content";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { createClient } from "@/lib/data/server";
import { studioPath } from "@/lib/studio/constants";

export type StandaloneContentActionState = {
  error: string | null;
  ok?: boolean;
};

export async function updateStandaloneStoryContentAction(
  _previousState: StandaloneContentActionState,
  formData: FormData
): Promise<StandaloneContentActionState> {
  const storyId = String(formData.get("story_id") ?? "").trim();
  const returnBasePath = resolveReturnBasePath(formData.get("return_base_path"));
  const { creatorProfile } = await requireCreatorProfile(
    `${returnBasePath}/stories/${storyId}/content`
  );

  const db = await createClient();
  const existingStory = await assertCreatorOwnsStory(creatorProfile, storyId);

  assertStoryIsStandalone(
    (existingStory as { structure_type?: string }).structure_type
  );

  const standaloneInput = parseStandaloneContentFromForm(formData);
  const standalonePersist = await resolveStandaloneStoryContentPersist(db, {
    storyId,
    ...standaloneInput,
    storyContentWarningsConfirmed: Boolean(
      (existingStory as { content_warnings_confirmed?: boolean })
        .content_warnings_confirmed
    ),
    strictPublish: false
  });

  const { error } = await db
    .from("stories")
    .update(standalonePersist)
    .eq("id", storyId)
    .eq("creator_id", creatorProfile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(studioPath(`/stories/${storyId}/content`));
  revalidatePath(studioPath(`/stories/${storyId}/edit`));

  return { error: null, ok: true };
}
