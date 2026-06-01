"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertCreatorOwnsStory } from "@/lib/creator/assertCreatorOwnsStory";
import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import {
  assertStoryIsStandalone,
  parseStandaloneContentFromForm,
  resolveStandaloneStoryContentPersist
} from "@/lib/creator/persist-standalone-story-content";
import { resolveReturnBasePath } from "@/lib/creator/resolveReturnBasePath";
import { createClient } from "@/lib/supabase/server";
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
  const { creatorProfile, user } = await getCurrentCreatorProfile();

  if (!user) {
    redirect(`/login?next=${returnBasePath}/stories/${storyId}/content`);
  }

  if (!creatorProfile) {
    redirect("/studio/setup");
  }

  const supabase = await createClient();
  const existingStory = await assertCreatorOwnsStory(creatorProfile, storyId);

  assertStoryIsStandalone(
    (existingStory as { structure_type?: string }).structure_type
  );

  const standaloneInput = parseStandaloneContentFromForm(formData);
  const standalonePersist = await resolveStandaloneStoryContentPersist(supabase, {
    storyId,
    ...standaloneInput,
    storyContentWarningsConfirmed: Boolean(
      (existingStory as { content_warnings_confirmed?: boolean })
        .content_warnings_confirmed
    ),
    strictPublish: false
  });

  const { error } = await supabase
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
