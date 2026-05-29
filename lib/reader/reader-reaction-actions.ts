"use server";

import { reactToChapter } from "@/lib/supabase/reactions";
import type { ChapterReactionKey } from "@/types/reaction";

export async function readerReactToChapterAction(formData: FormData) {
  await reactToChapter({
    chapterId: String(formData.get("chapterId") ?? ""),
    storyId: String(formData.get("storyId") ?? ""),
    reactionKey: String(formData.get("reactionKey") ?? "") as ChapterReactionKey,
    returnTo: String(formData.get("returnTo") ?? "")
  });
}
