"use server";

import { redirect } from "next/navigation";
import { followCreatorAction } from "@/lib/actions/followCreator";
import { saveStoryAction } from "@/lib/actions/saveStory";
import { appendStoryToastParam } from "@/lib/stories/story-toast";

export async function readerToggleSaveAction(formData: FormData) {
  const saved = formData.get("saved") === "true";
  const returnTo = String(formData.get("returnTo") ?? "");
  const creatorIdRaw = String(formData.get("creatorId") ?? "").trim();

  await saveStoryAction({
    creatorId: creatorIdRaw || null,
    returnTo,
    saved,
    storyId: String(formData.get("storyId") ?? ""),
    storySlug: String(formData.get("storySlug") ?? "")
  });

  redirect(appendStoryToastParam(returnTo, saved ? "saved" : "unsaved"));
}

export async function readerToggleFollowAction(formData: FormData) {
  const creatorId = String(formData.get("creatorId") ?? "").trim();
  if (!creatorId) {
    return;
  }

  const following = formData.get("following") === "true";
  const returnTo = String(formData.get("returnTo") ?? "");

  await followCreatorAction({
    creatorId,
    following,
    returnTo,
    storySlug: String(formData.get("storySlug") ?? "")
  });

  redirect(
    appendStoryToastParam(returnTo, following ? "follow_creator" : "unfollow_creator")
  );
}
