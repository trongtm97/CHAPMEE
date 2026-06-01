"use server";

import { redirect } from "next/navigation";
import { followCreatorAction } from "@/lib/actions/followCreator";
import { followStoryAction } from "@/lib/actions/followStory";
import { saveStoryAction } from "@/lib/actions/saveStory";
import { appendStoryToastParam } from "@/lib/stories/story-toast";
import type { TrackingSurface } from "@/types/tracking";

export async function storyToggleSaveAction(formData: FormData) {
  const saved = formData.get("saved") === "true";
  const returnTo = String(formData.get("returnTo") ?? "");
  const creatorIdRaw = String(formData.get("creatorId") ?? "").trim();
  const sourceSurfaceRaw = String(formData.get("sourceSurface") ?? "").trim();
  const trackingSurfaceRaw = String(formData.get("trackingSurface") ?? "").trim();

  await saveStoryAction({
    creatorId: creatorIdRaw || null,
    returnTo,
    saved,
    sourceSurface: sourceSurfaceRaw || undefined,
    trackingSurface: (trackingSurfaceRaw || undefined) as TrackingSurface | undefined,
    storyId: String(formData.get("storyId") ?? ""),
    storySlug: String(formData.get("storySlug") ?? "")
  });

  redirect(appendStoryToastParam(returnTo, saved ? "saved" : "unsaved"));
}

export async function storyToggleFollowStoryAction(formData: FormData) {
  const following = formData.get("following") === "true";
  const returnTo = String(formData.get("returnTo") ?? "");

  await followStoryAction({
    creatorId: String(formData.get("creatorId") ?? "").trim() || null,
    following,
    returnTo,
    storyId: String(formData.get("storyId") ?? ""),
    storySlug: String(formData.get("storySlug") ?? ""),
    storyTitle: String(formData.get("storyTitle") ?? "")
  });

  redirect(
    appendStoryToastParam(returnTo, following ? "follow_story" : "unfollow_story")
  );
}

export async function storyToggleFollowCreatorAction(formData: FormData) {
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
