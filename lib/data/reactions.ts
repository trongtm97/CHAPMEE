"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getChapterReactions,
  toggleChapterReaction
} from "@/lib/reactions/chapter-reactions";

export {
  getChapterReactions,
  getChapterReactions as getChapterReactionView,
  getMyChapterReactions,
  toggleChapterReaction
} from "@/lib/reactions/chapter-reactions";

/** @deprecated Use toggleChapterReactionAction — redirect-based legacy API. */
export async function reactToChapter(input: {
  chapterId: string;
  storyId: string;
  reactionKey: string;
  returnTo: string;
}) {
  const result = await toggleChapterReaction(input.chapterId, input.reactionKey);

  if (result.loginRequired) {
    redirect(`/login?next=${encodeURIComponent(input.returnTo)}`);
  }

  if (!result.ok) {
    throw new Error(result.error ?? "Không thể lưu cảm xúc.");
  }

  revalidatePath(input.returnTo);
  redirect(input.returnTo);
}

export async function getLegacyChapterReactionView(
  chapterId: string,
  profileId?: string | null
) {
  return getChapterReactions(chapterId, profileId);
}
