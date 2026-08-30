import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile, isAdminOrModerator } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/data/server";

export class ChapterImageUploadAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChapterImageUploadAccessError";
  }
}

export async function assertChapterImageUploadAccess(input: {
  storyId: string;
  episodeId?: string | null;
  draftId?: string | null;
}) {
  const db = await createClient();
  const {
    data: { user },
    error: userError
  } = await db.auth.getUser();

  if (userError || !user) {
    throw new ChapterImageUploadAccessError("Bạn cần đăng nhập để chèn ảnh.");
  }

  const { profile } = await getCurrentProfile();

  if (isAdminOrModerator(profile)) {
    const { data: story, error } = await db
      .from("stories")
      .select("id")
      .eq("id", input.storyId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!story) {
      throw new ChapterImageUploadAccessError("Không tìm thấy truyện.");
    }

    return { userId: user.id, isStaff: true as const };
  }

  const { creatorProfile } = await getCurrentCreatorProfile();

  if (!creatorProfile) {
    throw new ChapterImageUploadAccessError("Bạn cần thiết lập hồ sơ tác giả trước.");
  }

  try {
    await assertActionAccess(
      input.episodeId ? "chapter.update.own" : "chapter.create"
    );
  } catch (error) {
    if (error instanceof ActionAccessError) {
      throw new ChapterImageUploadAccessError(error.message);
    }
    throw error;
  }

  const { data: ownedStory, error: ownedError } = await db
    .from("stories")
    .select("id")
    .eq("id", input.storyId)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle();

  if (ownedError) {
    throw new Error(ownedError.message);
  }

  if (!ownedStory) {
    throw new ChapterImageUploadAccessError(
      "Bạn không có quyền tải ảnh cho chương này."
    );
  }

  if (input.episodeId) {
    const { data: episode, error: episodeError } = await db
      .from("episodes")
      .select("id")
      .eq("id", input.episodeId)
      .eq("story_id", input.storyId)
      .maybeSingle();

    if (episodeError) {
      throw new Error(episodeError.message);
    }

    if (!episode) {
      throw new ChapterImageUploadAccessError("Không tìm thấy chương.");
    }
  }

  if (input.draftId) {
    const { data: draft, error: draftError } = await db
      .from("creator_drafts")
      .select("id, owner_id, story_id")
      .eq("id", input.draftId)
      .maybeSingle();

    if (draftError) {
      throw new Error(draftError.message);
    }

    if (!draft || draft.owner_id !== user.id || draft.story_id !== input.storyId) {
      throw new ChapterImageUploadAccessError("Không tìm thấy bản nháp hợp lệ.");
    }
  }

  return { userId: user.id, isStaff: false as const };
}
