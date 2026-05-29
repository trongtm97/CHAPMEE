import { getCurrentCreatorProfile } from "@/lib/creator/getCreatorProfile";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentProfile, isAdminOrModerator } from "@/lib/auth/getCurrentProfile";
import { createClient } from "@/lib/supabase/server";

export class StoryImageUploadAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryImageUploadAccessError";
  }
}

export async function assertStoryImageUploadAccess(storyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new StoryImageUploadAccessError("Bạn cần đăng nhập để tải ảnh bìa.");
  }

  const { profile } = await getCurrentProfile();

  if (isAdminOrModerator(profile)) {
    const { data: story, error } = await supabase
      .from("stories")
      .select("id")
      .eq("id", storyId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!story) {
      throw new StoryImageUploadAccessError("Không tìm thấy truyện.");
    }

    return { userId: user.id, isStaff: true as const };
  }

  const { creatorProfile } = await getCurrentCreatorProfile();

  if (!creatorProfile) {
    throw new StoryImageUploadAccessError("Bạn cần thiết lập hồ sơ tác giả trước.");
  }

  try {
    await assertActionAccess("story.update.own");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      throw new StoryImageUploadAccessError(error.message);
    }
    throw error;
  }

  const { data: ownedStory, error: ownedError } = await supabase
    .from("stories")
    .select("id")
    .eq("id", storyId)
    .eq("creator_id", creatorProfile.id)
    .maybeSingle();

  if (ownedError) {
    throw new Error(ownedError.message);
  }

  if (!ownedStory) {
    throw new StoryImageUploadAccessError("Bạn không có quyền tải ảnh cho truyện này.");
  }

  return { userId: user.id, isStaff: false as const };
}
