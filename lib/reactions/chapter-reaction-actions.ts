"use server";

import { revalidatePath } from "next/cache";
import { toggleChapterReaction } from "@/lib/reactions/chapter-reactions";

export async function toggleChapterReactionAction(
  chapterId: string,
  reactionTypeKey: string,
  returnTo?: string
) {
  const result = await toggleChapterReaction(chapterId, reactionTypeKey);

  if (result.ok && returnTo) {
    revalidatePath(returnTo);
  }

  return result;
}
