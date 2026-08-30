import { containsForbiddenLocalMediaUrl } from "@/lib/media/media-url";
import type { DatabaseClient } from "@/lib/db/types";

export async function verifyChapterMediaIdsForPublish(
  db: DatabaseClient,
  mediaIds: string[],
  storyId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const unique = [...new Set(mediaIds.filter(Boolean))];
  if (unique.length === 0) {
    return { ok: true };
  }

  const { data: images, error } = await db
    .from("chapter_images")
    .select("id, image_url, thumb_url")
    .in("id", unique)
    .eq("story_id", storyId);

  if (error) {
    return { ok: false, message: "Không thể kiểm tra ảnh chương trước khi đăng." };
  }

  const found = new Set((images ?? []).map((row) => String(row.id)));
  for (const id of unique) {
    if (!found.has(id)) {
      return {
        ok: false,
        message: `Ảnh media_id "${id}" không tồn tại hoặc không thuộc truyện này.`
      };
    }
  }

  for (const row of images ?? []) {
    const imageUrl = String(row.image_url ?? "");
    const thumbUrl = String(row.thumb_url ?? "");
    if (
      containsForbiddenLocalMediaUrl(imageUrl) ||
      containsForbiddenLocalMediaUrl(thumbUrl)
    ) {
      return {
        ok: false,
        message:
          "Không được lưu URL local vào nội dung. Hãy upload ảnh qua hệ thống media của ChapMee."
      };
    }
    if (!imageUrl.trim()) {
      return { ok: false, message: `Ảnh "${row.id}" thiếu object key.` };
    }
  }

  const { data: assets, error: assetError } = await db
    .from("storage_assets")
    .select("linked_entity_id, status, path")
    .eq("linked_entity_type", "chapter_image")
    .in("linked_entity_id", unique);

  if (assetError) {
    return { ok: true };
  }

  const assetByEntity = new Map(
    (assets ?? []).map((row) => [String(row.linked_entity_id), row])
  );

  for (const id of unique) {
    const asset = assetByEntity.get(id);
    if (!asset?.status) {
      continue;
    }
    if (asset.status === "uploading") {
      return {
        ok: false,
        message: `Ảnh "${id}" chưa hoàn tất upload — đợi vài giây rồi thử lại.`
      };
    }
    if (asset.status !== "active") {
      return {
        ok: false,
        message: `Ảnh "${id}" không ở trạng thái active (hiện: ${asset.status}).`
      };
    }
  }

  return { ok: true };
}
