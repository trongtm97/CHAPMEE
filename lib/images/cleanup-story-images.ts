import { removeStoryImageStorageFolder } from "@/lib/images/upload-story-image-variants";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CleanupSupersededStoryImagesResult = {
  removedIds: string[];
  failedIds: string[];
};

/**
 * Xóa file storage của các bản ảnh đã bị thay thế (is_current = false).
 * Chỉ gọi sau khi ảnh mới đã lưu DB + storage thành công.
 * Hàng DB cũ giữ lại để audit; URL trong DB có thể không còn file.
 */
export async function cleanupSupersededStoryImageStorage(
  supabase: SupabaseClient,
  storyId: string,
  keepImageId: string
): Promise<CleanupSupersededStoryImagesResult> {
  const { data, error } = await supabase
    .from("story_images")
    .select("id")
    .eq("story_id", storyId)
    .eq("is_current", false)
    .neq("id", keepImageId);

  if (error) {
    console.warn(
      "[story-images] Không liệt kê được ảnh cũ để dọn:",
      storyId,
      error.message
    );
    return { removedIds: [], failedIds: [] };
  }

  const removedIds: string[] = [];
  const failedIds: string[] = [];

  for (const row of data ?? []) {
    const imageId = String(row.id);

    try {
      await removeStoryImageStorageFolder(supabase, storyId, imageId);
      removedIds.push(imageId);
    } catch (cleanupError) {
      failedIds.push(imageId);
      console.warn(
        "[story-images] Dọn storage thất bại:",
        storyId,
        imageId,
        cleanupError
      );
    }
  }

  if (removedIds.length > 0) {
    console.info(
      "[story-images] Đã dọn storage ảnh cũ:",
      storyId,
      removedIds.join(", ")
    );
  }

  return { removedIds, failedIds };
}

// TODO: Job định kỳ quét bucket story-images, xóa thư mục orphan không còn hàng story_images.
