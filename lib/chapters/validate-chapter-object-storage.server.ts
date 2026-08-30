import type { EpisodeContentStorageRow } from "@/lib/chapters/episode-content-row";
import { resolveEpisodeStorageType } from "@/lib/chapters/episode-content-row";
import { chapterContentObjectExists } from "@/lib/storage/chapter-content-storage";
import { validateEpisodeObjectStorageMetadata } from "@/lib/chapters/validate-chapter-object-storage";

export async function validateEpisodeObjectStorageForPublish(
  row: EpisodeContentStorageRow
): Promise<{ ok: true } | { ok: false; message: string }> {
  const metadata = validateEpisodeObjectStorageMetadata(row);
  if (!metadata.ok) {
    return metadata;
  }

  const objectKey = row.content_object_key?.trim();
  if (!objectKey || resolveEpisodeStorageType(row) === "db") {
    return metadata;
  }

  const exists = await chapterContentObjectExists({ objectKey });
  if (!exists) {
    return {
      ok: false,
      message: "Không tìm thấy file nội dung chương trên storage — không thể đăng."
    };
  }

  return { ok: true };
}
