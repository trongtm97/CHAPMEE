import type { EpisodeContentStorageRow } from "@/lib/chapters/episode-content-row";
import { resolveEpisodeStorageType } from "@/lib/chapters/episode-content-row";

/** Sync metadata checks (safe for client bundles). */
export function validateEpisodeObjectStorageMetadata(
  row: EpisodeContentStorageRow
): { ok: true } | { ok: false; message: string } {
  const storageType = resolveEpisodeStorageType(row);

  if (storageType === "db") {
    const inline = row.content?.trim() ?? "";
    if (!inline && !row.structured_content) {
      return { ok: false, message: "Thiếu nội dung chương." };
    }
    return { ok: true };
  }

  const objectKey = row.content_object_key?.trim();
  const hash = row.content_hash?.trim();
  const sizeBytes = Number(row.content_size_bytes ?? 0);

  if (!objectKey) {
    return { ok: false, message: "Chương thiếu content_object_key trên storage." };
  }
  if (!hash) {
    return { ok: false, message: "Chương thiếu content_hash." };
  }
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, message: "Kích thước nội dung chương không hợp lệ." };
  }

  const preview = row.plain_text_preview?.trim() || row.excerpt?.trim() || "";
  if (!preview && !row.word_count) {
    return { ok: false, message: "Thiếu preview nội dung chương trong metadata." };
  }

  return { ok: true };
}

/** Content string for publish checklist length checks. */
export function resolvePublishContentSample(row: EpisodeContentStorageRow): string {
  if (resolveEpisodeStorageType(row) === "db") {
    return row.content?.trim() ?? "";
  }
  return (
    row.plain_text_preview?.trim() ||
    row.excerpt?.trim() ||
    row.content?.trim() ||
    ""
  );
}
