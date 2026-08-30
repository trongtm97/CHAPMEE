"use server";

import { toggleChapterReactionAction } from "@/lib/reactions/chapter-reaction-actions";

/** @deprecated Use toggleChapterReactionAction from client components. */
export async function readerReactToChapterAction(formData: FormData) {
  const chapterId = String(formData.get("chapterId") ?? "");
  const reactionKey = String(formData.get("reactionKey") ?? "");
  const returnTo = String(formData.get("returnTo") ?? "");

  const result = await toggleChapterReactionAction(chapterId, reactionKey, returnTo);

  if (result.loginRequired && returnTo) {
    const { redirect } = await import("next/navigation");
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }

  if (!result.ok) {
    throw new Error(result.error ?? "Không thể lưu cảm xúc.");
  }
}
