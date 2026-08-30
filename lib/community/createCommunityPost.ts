"use server";

import { redirect } from "next/navigation";
import {
  insertCommunityPost,
  type InsertCommunityPostInput
} from "@/lib/community/insert-community-post";

export type CommunityPostFormState = {
  error: string | null;
  success: string | null;
};

export async function createCommunityPostAction(
  _previousState: CommunityPostFormState,
  formData: FormData
): Promise<CommunityPostFormState> {
  const input: InsertCommunityPostInput = {
    content: String(formData.get("content") ?? "").trim(),
    type: String(formData.get("type") ?? "").trim() || "discussion",
    storyId: String(formData.get("story_id") ?? "").trim() || null,
    episodeNumber: (() => {
      const raw = String(formData.get("episode_number") ?? "").trim();
      if (!raw) {
        return null;
      }
      const parsed = Number(raw);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    })()
  };

  const title = String(formData.get("title") ?? "").trim();
  if (title && !input.content.startsWith(title)) {
    input.content = title ? `${title}\n\n${input.content}` : input.content;
  }

  const result = await insertCommunityPost(input);

  if (result.ok === false) {
    if (result.error.includes("đăng nhập")) {
      redirect("/login?next=/community");
    }
    return { error: result.error, success: null };
  }

  return {
    error: null,
    success: "Đã đăng bài lên cộng đồng."
  };
}
